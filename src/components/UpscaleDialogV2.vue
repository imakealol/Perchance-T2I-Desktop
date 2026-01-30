<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount, nextTick, onMounted } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import SelectButton from 'primevue/selectbutton';
import ProgressBar from 'primevue/progressbar';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import Checkbox from 'primevue/checkbox';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { saveImageWithDialog } from '../utils/saveImage';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';

const toast = useToast();

const props = defineProps<{
    visible: boolean;
    imageSrc: string | null;
}>();

const emit = defineEmits(['update:visible']);

const isVisible = ref(props.visible);
const isUpscaling = ref(false);
const upscaleFactor = ref(2);
const modelName = ref('realesr-animevideov3');
const tileSize = ref('0');
const tileAuto = ref(true);
const gpuId = ref<string[]>([]);
const ttaMode = ref(true);

// Thread config split
const threadLoad = ref('1');
const threadProc = ref('2');
const threadSave = ref('2');

const threads = computed(() => {
    return `${threadLoad.value}:${threadProc.value}:${threadSave.value}`;
});
const progress = ref(0);
const progressMessage = ref('');
const upscaledImageUrl = ref<string | null>(null);
const displaySize = ref<{ width: number; height: number } | null>(null);
const previewAreaRef = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const originalImg = ref<HTMLImageElement | null>(null);
const upscaledImg = ref<HTMLImageElement | null>(null);

const scale = ref(1);
const offset = ref({ x: 0, y: 0 });
const isDraggingImage = ref(false);
const isDraggingSlider = ref(false);
const startPos = ref({ x: 0, y: 0 });
const sliderPosition = ref(50);

let unlistenProgress: (() => void) | null = null;

import MultiSelect from 'primevue/multiselect';

const scaleOptions = [
    { label: '2x', value: 2 },
    { label: '3x', value: 3 },
    { label: '4x', value: 4 }
];

const modelOptions = [
    { label: 'ESRGAN x4+', value: 'realesrgan-x4plus' },
    { label: 'ESRNet x4+', value: 'realesrnet-x4plus' },
    { label: 'ESRGAN x4+ (anime)', value: 'realesrgan-x4plus-anime' },
    { label: 'ESR video v3 (anime)', value: 'realesr-animevideov3' },
];

const gpuOptions = ref<{ label: string; value: string }[]>([]);

async function fetchGpus() {
    try {
        const gpus = await invoke<{ id: number; name: string }[]>('get_realesrgan_gpus');
        const detected = gpus.map(g => ({
            label: `[${g.id}] ${g.name}`,
            value: g.id.toString()
        }));
        gpuOptions.value = detected;
    } catch (e) {
        console.warn('Failed to fetch GPUs:', e);
    }
}

watch(() => props.visible, (val) => {
    isVisible.value = val;
    if (val && props.imageSrc) {
        if (upscaledImageUrl.value) {
            URL.revokeObjectURL(upscaledImageUrl.value);
            upscaledImageUrl.value = null;
        }
        upscaledImg.value = null;
        originalImg.value = null;
        upscaledImageUrl.value = null;
        progress.value = 0;
        progressMessage.value = '';
        sliderPosition.value = 50;
        upscaleFactor.value = 2;
        tileSize.value = '0';
        ttaMode.value = false;
        resetZoom();
        loadOriginalImage();
    }
});

const drawCanvas = () => {
    const canvas = canvasRef.value;
    if (!canvas || !displaySize.value || !originalImg.value) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to container size
    const container = previewAreaRef.value;
    if (container) {
        const dpr = window.devicePixelRatio || 1;
        // Force sync canvas size with container size
        const rect = container.getBoundingClientRect();
        // Always update width/height attributes if they don't match computed
        if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
            canvas.width = Math.floor(rect.width * dpr);
            canvas.height = Math.floor(rect.height * dpr);
        }
        // Ensure style always fills
        canvas.style.width = '100%';
        canvas.style.height = '100%';

        ctx.resetTransform();
        ctx.scale(dpr, dpr);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height); // Logical Width/Height by Scale

    // Image layout: Camera Pan Logic
    // imgX/Y is where the top-left of the image is drawn on screen (canvas space)
    const imgX = offset.value.x;
    const imgY = offset.value.y;
    const imgW = displaySize.value.width * scale.value;
    const imgH = displaySize.value.height * scale.value;

    // Split Line X position in Canvas Screen Coordinates
    // sliderPosition is % (0-100)
    // The visual X of the slider line relative to the screen is: imgX + (imgW * sliderPosition / 100)
    const splitVisualX = imgX + (imgW * (sliderPosition.value / 100));

    // Draw Original (Left Side)
    ctx.imageSmoothingEnabled = scale.value < 1;

    // Draw Full Original first
    ctx.drawImage(originalImg.value, imgX, imgY, imgW, imgH);

    // Draw Upscaled (Right Side)
    // We clip the separate region from splitVisualX to the right edge of the image
    if (upscaledImg.value) {
        ctx.save();
        ctx.beginPath();
        // Clip region: from splitVisualX, top Y, width to right edge, height
        // Be careful: if pan moves image offscreen, these cords can be negative or large
        ctx.rect(splitVisualX, imgY, imgW - (imgW * (sliderPosition.value / 100)), imgH);
        ctx.clip();

        ctx.drawImage(upscaledImg.value, imgX, imgY, imgW, imgH);
        ctx.restore();

        // Draw Slider Line
        ctx.beginPath();
        ctx.moveTo(splitVisualX, imgY);
        ctx.lineTo(splitVisualX, imgY + imgH);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();






    }
};

watch([scale, offset, sliderPosition, upscaledImg, originalImg], drawCanvas);

let resizeObserver: ResizeObserver | null = null;

onMounted(async () => {
    // Wait for DOM to be ready
    await nextTick();
    if (previewAreaRef.value) {
        // Use both ResizeObserver and window check
        resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                // Only trigger if size actually changed significantly
                if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
                    // Force update canvas internal size
                    const canvas = canvasRef.value;
                    if (canvas) {
                        const dpr = window.devicePixelRatio || 1;
                        canvas.width = Math.floor(entry.contentRect.width * dpr);
                        canvas.height = Math.floor(entry.contentRect.height * dpr);
                        canvas.style.width = '100%';
                        canvas.style.height = '100%';

                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.resetTransform();
                            ctx.scale(dpr, dpr);
                        }
                    }
                    // Redraw
                    requestAnimationFrame(() => {
                        fitToScreen();
                        drawCanvas();
                    });
                }
            }
        });
        resizeObserver.observe(previewAreaRef.value);
    }
    // Also listen to window resize as backup or for rapid changes
    window.addEventListener('resize', drawCanvas);

    fetchGpus();
});

onBeforeUnmount(() => {
    if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
    }
    window.removeEventListener('resize', drawCanvas);
});

const fitToScreen = () => {
    if (!displaySize.value || !previewAreaRef.value) return;

    const containerWidth = previewAreaRef.value.clientWidth;
    const containerHeight = previewAreaRef.value.clientHeight;

    if (containerWidth === 0 || containerHeight === 0) return;

    const padding = 20;
    const availableWidth = containerWidth - padding * 2;
    const availableHeight = containerHeight - padding * 2;

    const scaleW = availableWidth / displaySize.value.width;
    const scaleH = availableHeight / displaySize.value.height;

    const newScale = Math.min(scaleW, scaleH, 1);
    scale.value = newScale;

    // Center the image
    offset.value = {
        x: (containerWidth - displaySize.value.width * newScale) / 2,
        y: (containerHeight - displaySize.value.height * newScale) / 2
    };
};

watch(isVisible, (val) => {
    emit('update:visible', val);
});

onBeforeUnmount(() => {
    if (unlistenProgress) {
        unlistenProgress();
        unlistenProgress = null;
    }
});

async function loadOriginalImage() {
    if (!props.imageSrc) return;
    try {
        const img = new Image();
        img.src = props.imageSrc;
        await img.decode();
        originalImg.value = img;
        displaySize.value = {
            width: img.naturalWidth,
            height: img.naturalHeight
        };
        await nextTick();
        fitToScreen();
        requestAnimationFrame(drawCanvas);
    } catch (e) {
        console.error('Failed to load original image', e);
    }
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

async function runUpscale() {
    if (!props.imageSrc || isUpscaling.value) return;
    isUpscaling.value = true;
    if (upscaledImageUrl.value) {
        URL.revokeObjectURL(upscaledImageUrl.value);
        upscaledImageUrl.value = null;
    }
    progress.value = 0;
    progressMessage.value = '';

    const requestId = crypto.randomUUID();

    if (unlistenProgress) {
        unlistenProgress();
        unlistenProgress = null;
    }

    unlistenProgress = await listen<{ id: string; progress: number; message: string }>(
        'realesrgan-progress',
        (event) => {
            if (event.payload.id !== requestId) return;
            progress.value = event.payload.progress;
            progressMessage.value = event.payload.message || '';
        }
    );

    try {
        const response = await fetch(props.imageSrc);
        const blob = await response.blob();
        const buffer = await blob.arrayBuffer();
        const inputBase64 = arrayBufferToBase64(buffer);

        const result = await invoke<{ output_base64?: string; outputBase64?: string }>('run_realesrgan', {
            request: {
                id: requestId,
                inputBase64,
                scale: upscaleFactor.value,
                model: modelName.value,
                tileSize: (tileAuto.value || tileSize.value === '0' || !tileSize.value) ? null : tileSize.value,
                // If empty array, send "auto", else join with comma
                gpuId: gpuId.value.length === 0 ? 'auto' : gpuId.value.join(','),
                threads: threads.value.trim() ? threads.value.trim() : null,
                tta: ttaMode.value
            }
        });

        const outputBase64 = result.outputBase64 ?? result.output_base64;
        if (!outputBase64) {
            throw new Error('RealESRGAN did not return image data.');
        }
        const cleanedBase64 = outputBase64.trim();
        const base64Payload = cleanedBase64.includes('base64,')
            ? cleanedBase64.split('base64,')[1]
            : cleanedBase64;
        const normalizedPayload = base64Payload.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
        const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=');
        const binary = atob(paddedPayload);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
            bytes[i] = binary.charCodeAt(i);
        }
        const outputBlob = new Blob([bytes], { type: 'image/png' });
        const objectUrl = URL.createObjectURL(outputBlob);
        upscaledImageUrl.value = objectUrl;
        const probeImage = new Image();
        probeImage.src = objectUrl;
        await probeImage.decode();
        upscaledImg.value = probeImage;
        displaySize.value = {
            width: probeImage.naturalWidth,
            height: probeImage.naturalHeight
        };
        await nextTick();
        fitToScreen();
        drawCanvas();
        progress.value = 100;
    } catch (e) {
        console.error('RealESRGAN upscale failed', e);
        toast.add({ severity: 'error', summary: 'Upscale Failed', detail: (e as Error).message || 'Unknown error occurred', life: 3000 });
    } finally {
        isUpscaling.value = false;
        if (unlistenProgress) {
            unlistenProgress();
            unlistenProgress = null;
        }
    }
}

async function downloadImage() {
    if (!upscaledImageUrl.value) return;
    try {
        await saveImageWithDialog({
            sourceUrl: upscaledImageUrl.value,
            defaultFileName: `upscaled-realesrgan-${upscaleFactor.value}x-${Date.now()}.png`
        });
    } catch (error) {
        console.error('Failed to save upscaled image', error);
    }
}

const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(scale.value * delta, 0.01), 9.99);
    const worldX = (x - offset.value.x) / scale.value;
    const worldY = (y - offset.value.y) / scale.value;
    offset.value = {
        x: x - worldX * newScale,
        y: y - worldY * newScale
    };
    scale.value = newScale;
};

// No-op for now, replaced by onMouseDownRefactored logic merged below.

// We need state for panning delta
const panStartOffset = ref({ x: 0, y: 0 });

const handleMouseMove = (e: MouseEvent) => {
    const container = previewAreaRef.value;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDraggingSlider.value && displaySize.value) {
        // Calculate new slider % based on Mouse X relative to Image X
        // MouseX = imgX + (imgW * percent)
        // percent = (MouseX - imgX) / imgW
        const imgX = offset.value.x;
        const imgW = displaySize.value.width * scale.value;
        let percent = ((mouseX - imgX) / imgW) * 100;

        // Clamp 0-100
        percent = Math.max(0, Math.min(100, percent));
        sliderPosition.value = percent;
    } else if (isDraggingImage.value) {
        // Pan Logic
        const dx = mouseX - startPos.value.x;
        const dy = mouseY - startPos.value.y;

        // We need to know the offset when drag started? 
        // Currently startPos resets on MouseDown. 
        // But we need to ADD dx to the offset that WAS
        // Solution: Change handleMouseDown to save 'panStartOffset' = offset.value
        // Then offset.value = panStartOffset + dx
        // But 'startPos' is mouse pos.
        // Let's refactor handleMouseDown quickly above logic? 
        // Actually, let's fix it here by using delta from previous frame? 
        // No, standard is: newPos = startItemPos + (curMouse - startMouse).
        // My previous code used delta additions which drifts.
        offset.value = {
            x: panStartOffset.value.x + dx,
            y: panStartOffset.value.y + dy
        };
    }
};

// Fix MouseDown to use Pan Logic
const handleMouseDown = (e: MouseEvent) => {
    const container = previewAreaRef.value;
    if (!container || !displaySize.value) return;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (upscaledImg.value) {
        const imgW = displaySize.value.width * scale.value;
        const sliderVisualX = offset.value.x + (imgW * (sliderPosition.value / 100));
        // Hit test radius must match visual radius (30px)
        if (Math.abs(mouseX - sliderVisualX) < 30) {
            isDraggingSlider.value = true;
            return;
        }
    }

    isDraggingImage.value = true;
    startPos.value = { x: mouseX, y: mouseY };
    panStartOffset.value = { ...offset.value };
};

const handleMouseUp = () => {
    isDraggingImage.value = false;
    isDraggingSlider.value = false;
};

const resetZoom = () => {
    scale.value = 1;
    offset.value = { x: 0, y: 0 };
};

const containerStyle = computed(() => ({
    cursor: isDraggingImage.value ? 'grabbing' : 'grab',
    width: '100%',
    height: '100%',
    position: 'relative' as any
}));

const sliderStyle = computed(() => {
    if (!displaySize.value || !upscaledImg.value) return { display: 'none' };
    const imgW = displaySize.value.width * scale.value;
    const splitX = offset.value.x + (imgW * (sliderPosition.value / 100));

    // Check if slider is near center to determine cursor
    return {
        left: `${splitX}px`,
        top: `${offset.value.y}px`,
        height: `${displaySize.value.height * scale.value}px`,
        cursor: 'col-resize',
        width: '40px',
        position: 'absolute' as any,
        transform: 'translateX(-50%)',
        zIndex: 5,
        display: 'block'
    };
});

const compareViewStyle = computed(() => ({
    width: '100%',
    height: '100%',
    position: 'absolute' as any,
    top: 0,
    left: 0
}));
</script>

<template>
    <Toast />
    <Dialog v-model:visible="isVisible" modal class="upscale-dialog" :dismissableMask="true" maximizable
        :contentStyle="{ width: '80vw', height: '80vh', padding: 0, overflow: 'hidden' }" :showHeader="true" header=" ">
        <template #header>
            <div class="compact-header w-full flex items-center justify-between">
                <span class="font-bold mr-4 text-surface-200">Upscale</span>

                <div class="header-actions-center">
                    <Button label="Download" icon="pi pi-download" @click="downloadImage" :disabled="!upscaledImageUrl"
                        severity="secondary" size="small" outlined />
                    <Button label="Upscale" icon="pi pi-arrow-up" @click="runUpscale" :loading="isUpscaling"
                        severity="primary" size="small" />
                </div>

                <div class="header-zoom-controls" v-if="scale !== 1">
                    <span class="text-xs text-gray-400">Zoom: {{ Math.round(scale * 100) }}%</span>
                    <Button icon="pi pi-refresh" severity="secondary" text rounded size="small" class="w-6 h-6 p-0"
                        @click="resetZoom" v-tooltip="'Reset Zoom'" />
                </div>
            </div>
        </template>

        <div class="main-layout">
            <!-- Sidebar Controls -->
            <div class="settings-sidebar">
                <div class="control-group">
                    <label>Scale</label>
                    <SelectButton v-model="upscaleFactor" :options="scaleOptions" optionLabel="label"
                        optionValue="value" :disabled="isUpscaling" class="w-full scale-selector" />
                </div>

                <div class="control-group">
                    <label>Model</label>
                    <Select v-model="modelName" :options="modelOptions" optionLabel="label" optionValue="value"
                        :disabled="isUpscaling" class="w-full" />
                </div>

                <div class="control-group">
                    <label>GPU</label>
                    <MultiSelect v-model="gpuId" :options="gpuOptions" optionLabel="label" optionValue="value"
                        :disabled="isUpscaling" :maxSelectedLabels="1" placeholder="Auto" class="w-full"
                        display="chip" />
                </div>

                <div class="control-group">
                    <label>Tile size</label>
                    <div class="tile-size-row">
                        <div class="tile-auto">
                            <Checkbox v-model="tileAuto" :binary="true" :disabled="isUpscaling"
                                inputId="tileAutoCheck" />
                            <label for="tileAutoCheck" class="text-sm cursor-pointer select-none mb-0">Auto</label>
                        </div>
                        <InputText v-model="tileSize" :disabled="isUpscaling || tileAuto"
                            class="tile-size-input text-center" placeholder="0" />
                    </div>
                    <small class="text-gray-500">≥32 and separated by ',' for multi-gpu</small>
                </div>

                <div class="control-group">
                    <label>Threads</label>
                    <div class="threads-row">
                        <div class="thread-col">
                            <span class="text-xs text-gray-500">Load</span>
                            <InputText v-model="threadLoad" :min="1" :max="8" :disabled="isUpscaling"
                                class="text-center" />
                        </div>
                        <div class="thread-col">
                            <span class="text-xs text-gray-500">Proc</span>
                            <InputText v-model="threadProc" :disabled="isUpscaling" class="text-center" />
                        </div>
                        <div class="thread-col">
                            <span class="text-xs text-gray-500">Save</span>
                            <InputText v-model="threadSave" :min="1" :max="8" :disabled="isUpscaling"
                                class="text-center" />
                        </div>
                    </div>
                    <small class="text-gray-500">Use ':' separated values for multi-gpu</small>
                </div>

                <div class="control-group">
                    <label class="mb-0 font-semibold cursor-pointer select-none" for="ttaCheck">Test-Time
                        Augmentation</label>
                    <div class="tile-auto">
                        <Checkbox v-model="ttaMode" :binary="true" :disabled="isUpscaling" inputId="ttaCheck" />
                        <label for="ttaCheck" class="text-sm cursor-pointer select-none mb-0">Enable</label>
                    </div>
                </div>
            </div>

            <!-- Preview Area -->
            <div class="preview-area-wrapper">
                <div ref="previewAreaRef" class="preview-area" @wheel="handleWheel" @mousedown="handleMouseDown"
                    @mousemove="handleMouseMove" @mouseup="handleMouseUp" @mouseleave="handleMouseUp">
                    <div v-if="props.imageSrc" class="zoom-wrapper" :style="containerStyle">
                        <div class="compare-view" :style="compareViewStyle">
                            <canvas ref="canvasRef"></canvas>

                            <!-- Hidden hit area for slider cursor feedback -->
                            <div v-if="upscaledImageUrl" :style="sliderStyle"></div>

                            <div v-else class="placeholder-overlay" v-if="!isUpscaling">
                                <p>Select options and click Upscale</p>
                            </div>
                        </div>
                    </div>

                    <div v-if="isUpscaling" class="loading-overlay">
                        <ProgressBar :value="progress" :showValue="false" style="height: 6px; width: 260px" />
                        <p>Upscaling... {{ progress }}%</p>
                    </div>
                </div>
            </div>
        </div>
    </Dialog>
</template>

<style>
.upscale-dialog {
    max-height: 100vh !important;
}

/* ensure maximizable dialog takes full size */
.p-dialog-maximized .upscale-dialog {
    width: 100vw !important;
    height: 100vh !important;
    max-width: none !important;
    max-height: none !important;
}

.p-dialog-maximized .upscale-dialog .p-dialog-content {
    height: 100% !important;
    width: 100% !important;
    padding: 0 !important;
}

.main-layout {
    display: flex;
    height: 100%;
    width: 100%;
}

.settings-sidebar {
    width: 300px;
    background: var(--p-surface-900);
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    border-right: 1px solid var(--p-content-border-color);
    overflow-y: auto;
    flex-shrink: 0;
}

.preview-area-wrapper {
    flex: 1;
    min-width: 0;
    height: 100%;
    position: relative;
    background: #000;
}

.control-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.control-group label {
    font-size: 0.9rem;
    color: var(--p-text-color-secondary);
    font-weight: 600;
}

.header-actions-center {
    flex: 1;
    display: flex;
    justify-content: center;
    gap: 0.5rem;
}

.compact-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: nowrap;
}

.header-zoom-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: flex-end;
    margin-left: auto;
    white-space: nowrap;
    background-color: transparent;
    padding: 0;
    border-radius: 0;
}

.dialog-header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding-right: 2rem;
}

.preview-area {
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
    cursor: grab;
    background-image:
        linear-gradient(45deg, #1a1a1a 25%, transparent 25%),
        linear-gradient(-45deg, #1a1a1a 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #1a1a1a 75%),
        linear-gradient(-45deg, transparent 75%, #1a1a1a 75%);
    background-size: 20px 20px;
    background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
    background-color: #111;
}

.zoom-wrapper {
    transform-origin: top left;
    width: 100%;
    height: 100%;
}

.compare-view {
    position: relative;
    width: 100%;
    height: 100%;
}

.tile-size-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.tile-auto {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
}

.tile-size-input {
    flex: 2;
    min-width: 0;
}

.threads-row {
    display: flex;
    gap: 0.75rem;
    width: 100%;
}

.thread-col {
    flex: 1 1 0;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.25rem;
    min-width: 0;
}

.thread-col span {
    text-align: center;
}

.tta-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    width: 100%;
}

.tta-row label {
    flex: 1;
}

.tta-row :deep(.p-checkbox) {
    margin-left: auto;
}

.placeholder-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: rgba(255, 255, 255, 0.85);
    text-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
    font-weight: 500;
    pointer-events: none;
    text-align: center;
}

.loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    z-index: 20;
    color: white;
}

.zoom-info {
    font-variant-numeric: tabular-nums;
    font-size: 0.9rem;
    color: #aaa;
    margin-right: 0.5rem;
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-left: auto;
}

/* Helpers */
.w-full {
    width: 100%;
}

.flex-1 {
    flex: 1;
}

.text-center {
    text-align: center;
}

.flex-col {
    flex-direction: column;
}

.gap-1 {
    gap: 0.25rem;
}

.gap-2 {
    gap: 0.5rem;
}

.gap-3 {
    gap: 0.75rem;
}

.grid {
    display: grid;
}

.grid-cols-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
}

.items-center {
    align-items: center;
}

.justify-between {
    justify-content: space-between;
}

.mt-auto {
    margin-top: auto;
}

.pt-4 {
    padding-top: 1rem;
}

.text-sm {
    font-size: 0.875rem;
}

.text-xs {
    font-size: 0.75rem;
}

.mb-2 {
    margin-bottom: 0.5rem;
}

.mb-3 {
    margin-bottom: 0.75rem;
}

.text-gray-400 {
    color: #9ca3af;
}

.text-gray-500 {
    color: #6b7280;
}

.mb-0 {
    margin-bottom: 0 !important;
}

/* FIX: Ensure select buttons fill width */
.scale-selector :deep(.p-selectbutton) {
    width: 100%;
    display: flex;
}

.scale-selector :deep(.p-selectbutton-button) {
    flex: 1 1 0;
    justify-content: center;
    padding: 0.5rem !important;
}

/* FIX: Input centering & sizing */
.settings-sidebar :deep(.p-inputtext) {
    text-align: center;
    padding: 0.5rem;
    width: 100%;
}

.settings-sidebar :deep(.p-inputnumber-input) {
    text-align: center;
    width: 100%;
    padding: 0.5rem;
}

.settings-sidebar :deep(.p-inputnumber) {
    width: 100%;
    display: block;
    /* Ensure it takes full width of grid cell */
}

.scale-75 {
    transform: scale(0.75);
}

.bg-surface-800 {
    background-color: var(--p-surface-800);
}

.text-surface-200 {
    color: var(--p-surface-200);
}

.shrink-0 {
    flex-shrink: 0;
}

.min-w-0 {
    min-width: 0;
}

.font-normal {
    font-weight: normal !important;
}

.h-8 {
    height: 2rem;
}

.h-full {
    height: 100%;
}

.mr-4 {
    margin-right: 1rem;
}

.w-6 {
    width: 1.5rem;
}

.h-6 {
    height: 1.5rem;
}
</style>