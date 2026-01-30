<script setup lang="ts">
import { ref, watch, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import SelectButton from 'primevue/selectbutton';
import ProgressBar from 'primevue/progressbar';
import { saveImageWithDialog } from '../utils/saveImage';


const props = defineProps<{
    visible: boolean;
    imageSrc: string | null;
}>();

const emit = defineEmits(['update:visible']);

const isVisible = ref(props.visible);
const isUpscaling = ref(false);
const upscaleFactor = ref(2);
const modelQuality = ref<'s' | 'm' | 'l'>('s');
const modelType = ref<'an' | '3d' | 'rl'>('an');

const upscaledImageUrl = ref<string | null>(null);
// We'll store drawable objects here
const originalImg = ref<ImageBitmap | HTMLImageElement | null>(null);
const upscaledImg = ref<ImageBitmap | HTMLCanvasElement | null>(null);

// Canvas Refs
const previewAreaRef = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const displaySize = ref<{ width: number; height: number } | null>(null);

// State
const sliderPosition = ref(50);
const scale = ref(1);
const offset = ref({ x: 0, y: 0 });
const isDraggingImage = ref(false);
const isDraggingSlider = ref(false);
const startPos = ref({ x: 0, y: 0 });
// For precise panning we track the offset at start of drag
const panStartOffset = ref({ x: 0, y: 0 });

const scaleOptions = [
    { label: '2x', value: 2 },
    { label: '3x', value: 3 },
    { label: '4x', value: 4 }
];

const qualityOptions = [
    { label: 'Fast (S)', value: 's' },
    { label: 'Balanced (M)', value: 'm' },
    { label: 'High (L)', value: 'l' }
];

const typeOptions = [
    { label: 'Anime', value: 'an' },
    { label: '3D', value: '3d' },
    { label: 'Realistic', value: 'rl' }
];

// --- Watchers & Lifecycle ---

watch(() => props.visible, (val) => {
    isVisible.value = val;
    if (val) {
        if (props.imageSrc) {
            // Reset
            upscaledImageUrl.value = null;
            upscaledImg.value = null;
            sliderPosition.value = 50;
            resetZoom();
            loadOriginalImage();
        }
    } else {
        // cleanup if needed
    }
});

watch(isVisible, (val) => {
    emit('update:visible', val);
});

// Redraw when these change
watch([scale, offset, sliderPosition, upscaledImg, originalImg], () => {
    requestAnimationFrame(drawCanvas);
});

let resizeObserver: ResizeObserver | null = null;

onMounted(async () => {
    await nextTick();
    if (previewAreaRef.value) {
        resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
                    // Force sync canvas size
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
                    requestAnimationFrame(() => {
                        // Optional: refit if completely resized? 
                        // For now just redraw.
                        // fitToScreen(); 
                        drawCanvas();
                    });
                }
            }
        });
        resizeObserver.observe(previewAreaRef.value);
    }
    window.addEventListener('resize', drawCanvas);
});

onBeforeUnmount(() => {
    if (resizeObserver) {
        resizeObserver.disconnect();
    }
    window.removeEventListener('resize', drawCanvas);
});


// --- Core Logic ---

async function loadOriginalImage() {
    if (!props.imageSrc) return;
    try {
        const response = await fetch(props.imageSrc);
        const blob = await response.blob();
        originalImg.value = await createImageBitmap(blob);

        displaySize.value = {
            width: originalImg.value.width,
            height: originalImg.value.height
        };

        await nextTick();
        fitToScreen();
        drawCanvas();
    } catch (e) {
        console.error("Failed to load original image", e);
    }
}

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

    // Center
    offset.value = {
        x: (containerWidth - displaySize.value.width * newScale) / 2,
        y: (containerHeight - displaySize.value.height * newScale) / 2
    };
};

const drawCanvas = () => {
    const canvas = canvasRef.value;
    if (!canvas || !displaySize.value || !originalImg.value) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas size management (duplicated in ResizeObserver but good to have safety)
    const container = previewAreaRef.value;
    if (container) {
        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
            canvas.width = Math.floor(rect.width * dpr);
            canvas.height = Math.floor(rect.height * dpr);
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            ctx.resetTransform();
            ctx.scale(dpr, dpr);
        }
    }

    // Clear
    // Note: If using scale(dpr, dpr), we clear based on logical size.
    // logical width = canvas.width / dpr
    const logicalW = canvas.width / (window.devicePixelRatio || 1);
    const logicalH = canvas.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, logicalW, logicalH);

    const imgX = offset.value.x;
    const imgY = offset.value.y;
    const imgW = displaySize.value.width * scale.value;
    const imgH = displaySize.value.height * scale.value;

    const splitVisualX = imgX + (imgW * (sliderPosition.value / 100));

    // Draw Original
    ctx.imageSmoothingEnabled = scale.value < 1;
    // We can draw ImageBitmap directly
    ctx.drawImage(originalImg.value, imgX, imgY, imgW, imgH);

    // Draw Upscaled
    if (upscaledImg.value) {
        ctx.save();
        ctx.beginPath();
        // Clip right side
        // Current Rect: splitVisualX to ... end of screen? or just end of image?
        // Safest to clip large enough to cover the rest of the screen/image
        // Use visible area logic
        ctx.rect(splitVisualX, imgY, imgW - (imgW * (sliderPosition.value / 100)), imgH);
        ctx.clip();

        ctx.drawImage(upscaledImg.value, imgX, imgY, imgW, imgH);
        ctx.restore();

        // Draw Divider
        ctx.beginPath();
        ctx.moveTo(splitVisualX, imgY);
        ctx.lineTo(splitVisualX, imgY + imgH);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
};


// --- Upscale Logic ---

async function runUpscale() {
    if (!props.imageSrc || isUpscaling.value) return;

    isUpscaling.value = true;
    upscaledImageUrl.value = null;

    try {
        const response = await fetch(props.imageSrc);
        const blob = await response.blob();
        let file = new File([blob], "input.png", { type: "image/png" });

        const networkArchitecture = `anime4k/cnn-2x-${modelQuality.value}`;
        const weightFile = `cnn-2x-${modelQuality.value}-${modelType.value}.json`;
        const weightUrl = `./weights/anime4k/${weightFile}`;

        const outCanvas = document.createElement("canvas");

        await upscalePreview2x({
            file,
            networkName: networkArchitecture,
            weightUrl: weightUrl,
            outCanvas
        });

        if (upscaleFactor.value === 4) {
            const blob2 = await new Promise<Blob | null>(r => outCanvas.toBlob(r));
            if (!blob2) throw new Error("Canvas to Blob failed");
            const file2 = new File([blob2], "pass2.png", { type: "image/png" });
            await upscalePreview2x({
                file: file2,
                networkName: networkArchitecture,
                weightUrl: weightUrl,
                outCanvas
            });
        }
        else if (upscaleFactor.value === 3) {
            const blob2 = await new Promise<Blob | null>(r => outCanvas.toBlob(r));
            if (!blob2) throw new Error("Canvas to Blob failed");
            const file2 = new File([blob2], "pass2.png", { type: "image/png" });
            await upscalePreview2x({
                file: file2,
                networkName: networkArchitecture,
                weightUrl: weightUrl,
                outCanvas
            });
            // Resize to 3x
            const w4x = outCanvas.width;
            const h4x = outCanvas.height;
            const w3x = Math.round(w4x * 0.75);
            const h3x = Math.round(h4x * 0.75);
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = w3x;
            finalCanvas.height = h3x;
            const ctx = finalCanvas.getContext('2d');
            ctx?.drawImage(outCanvas, 0, 0, w3x, h3x);
            outCanvas.width = w3x;
            outCanvas.height = h3x;
            outCanvas.getContext('2d')?.drawImage(finalCanvas, 0, 0);
        }

        // Store result for download and drawing
        upscaledImageUrl.value = outCanvas.toDataURL("image/png");
        // For drawing, we can just use the canvas or create a bitmap. 
        // Using CreateImageBitmap is async but efficient.
        upscaledImg.value = await createImageBitmap(outCanvas);

        drawCanvas();

    } catch (e) {
        console.error("Upscale failed", e);
    } finally {
        isUpscaling.value = false;
    }
}

async function upscalePreview2x(opts: {
    file: File;
    networkName: string;
    weightUrl: string;
    maxSide?: number;
    outCanvas: HTMLCanvasElement;
}) {
    const { file, networkName, weightUrl, outCanvas } = opts;
    const gpu = await WebSR.initWebGPU();
    if (!gpu) throw new Error("WebGPU not supported.");

    const weights = await (await fetch(weightUrl)).json();
    const bmp = await createImageBitmap(file);

    outCanvas.width = bmp.width * 2;
    outCanvas.height = bmp.height * 2;

    const websr = new WebSR({
        resolution: { width: bmp.width, height: bmp.height },
        network_name: networkName as any,
        weights,
        gpu,
        canvas: outCanvas,
    });
    await websr.render(bmp);
}

async function downloadImage() {
    if (!upscaledImageUrl.value) return;
    try {
        await saveImageWithDialog({
            dataUrl: upscaledImageUrl.value,
            defaultFileName: `upscaled-${upscaleFactor.value}x-${Date.now()}.png`
        });
    } catch (error) {
        console.error('Failed to save upscaled image', error);
    }
}


// --- Interaction Logic ---

const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(scale.value * delta, 0.01), 9.99);

    // Zoom towards mouse
    const worldX = (x - offset.value.x) / scale.value;
    const worldY = (y - offset.value.y) / scale.value;

    offset.value = {
        x: x - worldX * newScale,
        y: y - worldY * newScale
    };
    scale.value = newScale;
};

const handleMouseDown = (e: MouseEvent) => {
    const container = previewAreaRef.value;
    if (!container || !displaySize.value) return;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check slider hit
    if (upscaledImg.value) {
        const imgW = displaySize.value.width * scale.value;
        const sliderVisualX = offset.value.x + (imgW * (sliderPosition.value / 100));
        if (Math.abs(mouseX - sliderVisualX) < 30) {
            isDraggingSlider.value = true;
            return;
        }
    }

    isDraggingImage.value = true;
    startPos.value = { x: mouseX, y: mouseY };
    panStartOffset.value = { ...offset.value };
};

const handleMouseMove = (e: MouseEvent) => {
    const container = previewAreaRef.value;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDraggingSlider.value && displaySize.value) {
        const imgX = offset.value.x;
        const imgW = displaySize.value.width * scale.value;
        let percent = ((mouseX - imgX) / imgW) * 100;
        percent = Math.max(0, Math.min(100, percent));
        sliderPosition.value = percent;
    } else if (isDraggingImage.value) {
        const dx = mouseX - startPos.value.x;
        const dy = mouseY - startPos.value.y;
        offset.value = {
            x: panStartOffset.value.x + dx,
            y: panStartOffset.value.y + dy
        };
    }
};

const handleMouseUp = () => {
    isDraggingImage.value = false;
    isDraggingSlider.value = false;
};

const resetZoom = () => {
    scale.value = 1;
    offset.value = { x: 0, y: 0 };
    fitToScreen();
};

const containerStyle = computed(() => ({
    cursor: isDraggingImage.value ? 'grabbing' : 'grab',
    width: '100%',
    height: '100%',
    position: 'relative' as any
}));

// Slider cursor logic (floating element over canvas to show cursor when hovering trigger zone)
const sliderTriggerStyle = computed(() => {
    if (!displaySize.value || !upscaledImg.value) return { display: 'none' };
    const imgW = displaySize.value.width * scale.value;
    const splitX = offset.value.x + (imgW * (sliderPosition.value / 100));

    return {
        left: `${splitX}px`,
        top: `${offset.value.y}px`,
        height: `${displaySize.value.height * scale.value}px`,
        cursor: 'col-resize',
        width: '30px',
        position: 'absolute' as any,
        transform: 'translateX(-50%)',
        zIndex: 5,
        display: 'block'
    };
});

</script>

<template>
    <Dialog v-model:visible="isVisible" modal class="upscale-dialog" :dismissableMask="true" maximizable
        :contentStyle="{ width: '80vw', height: '80vh', display: 'flex', flexDirection: 'column' }">
        <template #header>
            <div class="custom-header">
                <div class="header-controls">
                    <div class="control-group-mini">
                        <span class="label-mini">UPSCALE</span>
                        <SelectButton v-model="upscaleFactor" :options="scaleOptions" optionLabel="label"
                            optionValue="value" :disabled="isUpscaling" size="small" />
                    </div>

                    <div class="control-group-mini">
                        <span class="label-mini">Type</span>
                        <SelectButton v-model="modelType" :options="typeOptions" optionLabel="label" optionValue="value"
                            :disabled="isUpscaling" size="small" />
                    </div>

                    <div class="control-group-mini">
                        <span class="label-mini">Quality</span>
                        <SelectButton v-model="modelQuality" :options="qualityOptions" optionLabel="label"
                            optionValue="value" :disabled="isUpscaling" size="small" />
                    </div>

                    <Button label="Upscale" icon="pi pi-bolt" @click="runUpscale" :loading="isUpscaling"
                        severity="primary" size="small" />
                    <Button label="Download" icon="pi pi-download" @click="downloadImage" :disabled="!upscaledImageUrl"
                        severity="secondary" size="small" />
                </div>

                <div class="header-actions">
                    <span v-if="scale" class="zoom-info">{{ Math.round(scale * 100) }}%</span>
                    <Button icon="pi pi-refresh" severity="secondary" text rounded size="small" @click="resetZoom"
                        v-tooltip.bottom="'Reset Zoom'" />
                </div>
            </div>
        </template>

        <div class="upscale-container">
            <!-- Canvas Preview Area -->
            <div class="preview-area-wrapper">
                <div ref="previewAreaRef" class="preview-area" @wheel="handleWheel" @mousedown="handleMouseDown"
                    @mousemove="handleMouseMove" @mouseup="handleMouseUp" @mouseleave="handleMouseUp">

                    <div class="zoom-wrapper" :style="containerStyle">
                        <div class="compare-view-canvas">
                            <canvas ref="canvasRef"></canvas>
                            <!-- Invisible trigger for slider hover cursor -->
                            <div v-if="upscaledImageUrl" :style="sliderTriggerStyle"></div>

                            <div v-if="!upscaledImageUrl && !isUpscaling" class="placeholder-overlay">
                                <p>Select options and click Upscale</p>
                            </div>
                        </div>
                    </div>

                    <div v-if="isUpscaling" class="loading-overlay">
                        <ProgressBar mode="indeterminate" :showValue="false" style="height: 6px; width: 200px" />
                        <p>Upscaling...</p>
                    </div>
                </div>
            </div>
        </div>
    </Dialog>
</template>

<style scoped>
.upscale-dialog {
    width: 95vw;
    max-width: 1600px;
}

.upscale-container {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
}

.preview-area-wrapper {
    flex: 1;
    min-width: 0;
    height: 100%;
    position: relative;
    background: #111;
    background-image:
        linear-gradient(45deg, #1a1a1a 25%, transparent 25%),
        linear-gradient(-45deg, #1a1a1a 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #1a1a1a 75%),
        linear-gradient(-45deg, transparent 75%, #1a1a1a 75%);
    background-size: 20px 20px;
}

.preview-area {
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
}

.zoom-wrapper {
    transform-origin: top left;
    width: 100%;
    height: 100%;
}

.compare-view-canvas {
    width: 100%;
    height: 100%;
}


/* Custom header styling (Copied from original) */
.custom-header {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    width: 100%;
    padding-right: 2rem;
}

.header-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    flex: 1;
}

.control-group-mini {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--p-surface-800);
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
}

.label-mini {
    font-size: 0.75rem;
    color: var(--p-text-color-secondary);
    font-weight: 500;
    text-transform: uppercase;
}

:deep(.p-selectbutton-button) {
    padding: 0.25rem 0.5rem !important;
    font-size: 0.75rem !important;
}

.placeholder-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.6);
    padding: 1rem 2rem;
    border-radius: 8px;
    color: white;
    backdrop-filter: blur(4px);
    pointer-events: none;
}

.loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    z-index: 100;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: white;
    gap: 1rem;
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.zoom-info {
    font-size: 0.85rem;
    font-variant-numeric: tabular-nums;
    color: var(--p-text-color-secondary);
}
</style>
