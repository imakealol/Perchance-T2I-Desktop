<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import SelectButton from 'primevue/selectbutton';
import ProgressBar from 'primevue/progressbar';

const props = defineProps<{
    visible: boolean;
    imageSrc: string | null;
}>();

const emit = defineEmits(['update:visible']);
// ... existing code ...


const isVisible = ref(props.visible);
const isUpscaling = ref(false);
const upscaleFactor = ref(2);
const modelQuality = ref<'s' | 'm' | 'l'>('s');
const modelType = ref<'an' | '3d' | 'rl'>('an'); // Default to Anime
const sliderPosition = ref(50);
const upscaledImageUrl = ref<string | null>(null);
const originalImageBitmap = ref<ImageBitmap | null>(null);

// Zoom & Pan State
const scale = ref(1);
const offset = ref({ x: 0, y: 0 });
const isDraggingImage = ref(false);
const isDraggingSlider = ref(false);
const startPos = ref({ x: 0, y: 0 });

// Options for controls
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

watch(() => props.visible, (val) => {
    isVisible.value = val;
    if (val && props.imageSrc) {
        // Reset state when opening
        upscaledImageUrl.value = null;
        sliderPosition.value = 50;
        resetZoom();
        loadOriginalImage();
    }
});

watch(isVisible, (val) => {
    emit('update:visible', val);
});

async function loadOriginalImage() {
    if (!props.imageSrc) return;
    try {
        const response = await fetch(props.imageSrc);
        const blob = await response.blob();
        originalImageBitmap.value = await createImageBitmap(blob);
    } catch (e) {
        console.error("Failed to load original image", e);
    }
}


async function runUpscale() {
    if (!props.imageSrc || isUpscaling.value) return;

    isUpscaling.value = true;
    upscaledImageUrl.value = null;

    try {
        const response = await fetch(props.imageSrc);
        const blob = await response.blob();
        let file = new File([blob], "input.png", { type: "image/png" });

        // Architecture name for WebSR (must be one of the supported networks, e.g. anime4k/cnn-2x-s)
        const networkArchitecture = `anime4k/cnn-2x-${modelQuality.value}`;

        // Specific weight file to load (e.g. cnn-2x-s-an.json)
        const weightFile = `cnn-2x-${modelQuality.value}-${modelType.value}.json`;
        const weightUrl = `./weights/anime4k/${weightFile}`;

        // Setup output canvas
        const outCanvas = document.createElement("canvas");

        // Initial 2x upscale
        await upscalePreview2x({
            file,
            networkName: networkArchitecture,
            weightUrl: weightUrl,
            outCanvas
        });

        // For 4x, run it again on the result
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
            // Now outCanvas is 4x. We need to resize to 3x.
            const w4x = outCanvas.width;
            const h4x = outCanvas.height;
            const w3x = Math.round(w4x * 0.75);
            const h3x = Math.round(h4x * 0.75);

            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = w3x;
            finalCanvas.height = h3x;
            const ctx = finalCanvas.getContext('2d');
            ctx?.drawImage(outCanvas, 0, 0, w3x, h3x);

            // Copy back to outCanvas
            outCanvas.width = w3x;
            outCanvas.height = h3x;
            outCanvas.getContext('2d')?.drawImage(finalCanvas, 0, 0);
        }

        upscaledImageUrl.value = outCanvas.toDataURL("image/png");

    } catch (e) {
        console.error("Upscale failed", e);
        // alert("Upscale failed: " + e);
    } finally {
        isUpscaling.value = false;
    }
}

// Adapted from user request
async function upscalePreview2x(opts: {
    file: File;
    networkName: string;
    weightUrl: string;
    maxSide?: number;
    outCanvas: HTMLCanvasElement;
}) {
    const { file, networkName, weightUrl, outCanvas } = opts;

    const gpu = await WebSR.initWebGPU();
    if (!gpu) throw new Error("WebGPU not supported (try latest Chrome/Edge).");

    console.log(`Loading weights from: ${weightUrl}`);
    const weights = await (await fetch(weightUrl)).json();

    const bmp = await createImageBitmap(file);
    console.log(`Original Dimensions: ${bmp.width}x${bmp.height} | Network: ${networkName}`);

    // Output is 2x
    outCanvas.width = bmp.width * 2;
    outCanvas.height = bmp.height * 2;

    const websr = new WebSR({
        resolution: { width: bmp.width, height: bmp.height },
        network_name: networkName as any,
        weights,
        gpu,
        canvas: outCanvas,
    });

    // Pass ImageBitmap directly instead of intermediate canvas
    await websr.render(bmp);
}

function downloadImage() {
    if (!upscaledImageUrl.value) return;
    const link = document.createElement('a');
    link.href = upscaledImageUrl.value;
    link.download = `upscaled-${upscaleFactor.value}x-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Zoom / Pan Logic
const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();

    // Mouse position relative to the container (0,0 is top-left)
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? 0.9 : 1.1; // Zoom out (0.9) or in (1.1)

    // Limit between 1% (0.01) and 999% (9.99)
    const newScale = Math.min(Math.max(scale.value * delta, 0.01), 9.99);

    // Calculate the point under the mouse in "world" coordinates (relative to the unscaled content)
    // world_pos = (mouse_pos - current_offset) / current_scale
    const worldX = (x - offset.value.x) / scale.value;
    const worldY = (y - offset.value.y) / scale.value;

    // Calculate new offset to keep the world point under the mouse
    // new_offset = mouse_pos - (world_pos * new_scale)
    offset.value = {
        x: x - worldX * newScale,
        y: y - worldY * newScale
    };

    scale.value = newScale;
};

const handleMouseDown = (e: MouseEvent) => {
    // Only drag if zoomed in or if desired
    if (scale.value > 1 || true) { // Allow panning even at 1x if it helps
        isDraggingImage.value = true;
        startPos.value = { x: e.clientX - offset.value.x, y: e.clientY - offset.value.y };
    }
};

const handleMouseMove = (e: MouseEvent) => {
    if (isDraggingImage.value) {
        offset.value = {
            x: e.clientX - startPos.value.x,
            y: e.clientY - startPos.value.y
        };
    }

    // Handle slider drag if active
    if (isDraggingSlider.value) {
        // Calculate percentage within the compare-view
        // We need reference to compare-view or just calculate roughly based on movement?
        // Better to get bounding rect of the container.
        const container = (e.target as Element).closest('.compare-view');
        if (container) {
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
            sliderPosition.value = percent;
        }
    }
};

const handleMouseUp = () => {
    isDraggingImage.value = false;
    isDraggingSlider.value = false;
};

const startSliderDrag = (e: MouseEvent) => {
    e.stopPropagation(); // prevent pan start
    isDraggingSlider.value = true;

    // We should bind a specific mouse move on body/window to keep dragging even if mouse leaves handle?
    // For now rely on container mouse move + mouseleave
};

const resetZoom = () => {
    scale.value = 1;
    offset.value = { x: 0, y: 0 };
};

const containerStyle = computed(() => ({
    transform: `translate(${offset.value.x}px, ${offset.value.y}px) scale(${scale.value})`,
    cursor: isDraggingImage.value ? 'grabbing' : 'grab',
    transition: (isDraggingImage.value || isDraggingSlider.value) ? 'none' : 'transform 0.1s ease-out',
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    transformOrigin: '0 0'
}));

// Slider logic
const sliderStyle = computed(() => ({
    left: `${sliderPosition.value}%`
}));

const afterImageClip = computed(() => ({
    clipPath: `inset(0 0 0 ${sliderPosition.value}%)`
}));

</script>

<template>
    <Dialog v-model:visible="isVisible" modal class="upscale-dialog" :dismissableMask="true" maximizable
        :contentStyle="{ height: '100%', display: 'flex', flexDirection: 'column' }">
        <!-- Custom Header -->
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
                    <span v-if="scale !== 1" class="zoom-info">{{ Math.round(scale * 100) }}%</span>
                    <Button v-if="scale !== 1" icon="pi pi-refresh" severity="secondary" text rounded size="small"
                        @click="resetZoom" v-tooltip.bottom="'Reset Zoom'" />
                </div>
            </div>
        </template>

        <div class="upscale-container">
            <div class="preview-area" @wheel="handleWheel" @mousedown="handleMouseDown" @mousemove="handleMouseMove"
                @mouseup="handleMouseUp" @mouseleave="handleMouseUp">

                <div v-if="props.imageSrc" class="zoom-wrapper" :style="containerStyle">
                    <div class="compare-view">
                        <!-- Before Image (Background) -->
                        <img :src="props.imageSrc" class="image-layer before" alt="Original" @dragstart.prevent />

                        <!-- After Image (Foreground, clipped) -->
                        <div v-if="upscaledImageUrl" class="image-layer after-container" :style="afterImageClip">
                            <img :src="upscaledImageUrl" class="image-layer after" alt="Upscaled" @dragstart.prevent />
                        </div>

                        <!-- Slider UI -->
                        <template v-if="upscaledImageUrl">
                            <!-- Slider Handle -->
                            <div class="slider-handle" :style="sliderStyle" @mousedown="startSliderDrag">
                                <div class="line"></div>
                                <div class="handle-button">
                                    <i class="pi pi-arrows-h"></i>
                                </div>
                            </div>
                        </template>

                        <div v-else class="placeholder-overlay" v-if="!isUpscaling">
                            <p>Select options and click Upscale</p>
                        </div>
                    </div>
                </div>

                <div v-if="isUpscaling" class="loading-overlay">
                    <ProgressBar mode="indeterminate" style="height: 6px; width: 200px" />
                    <p>Upscaling...</p>
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
}

/* Custom header styling */
.custom-header {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    width: 100%;
    /* Ensure it doesn't overlap with close icon provided by Dialog */
    padding-right: 2rem;
}

.header-title {
    font-weight: 700;
    font-size: 1.1rem;
    white-space: nowrap;
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

/* Adjust SelectButton in mini mode */
:deep(.p-selectbutton-button) {
    padding: 0.25rem 0.5rem !important;
    font-size: 0.75rem !important;
}

.preview-area {
    flex: 1;
    background: var(--p-surface-900);
    border-radius: 6px;
    overflow: hidden;
    position: relative;
    /* Cursor handling is on containerStyle */
}


.zoom-wrapper {
    /* Transforms applied here */
    transform-origin: 0 0;
}

.compare-view {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    /* Define a max size references */
}

/*
Logic for sizing:
The 'before' image drives the layout. It is constrained by max-width/height of the container.
The 'after' image assumes it has the same aspect ratio and fully fills the 'before' image's box.
This ensures they overlap perfectly regardless of resolution differences.
*/

.image-layer {
    user-select: none;
    -webkit-user-drag: none;
    pointer-events: none;
    /* Let clicks pass to container */
}

.before {
    display: block;
    position: relative;
    max-width: 100%;
    max-height: 100%;
    width: auto;
    height: auto;
    image-rendering: pixelated;
    /* Show pixels clearly when zoomed */
}

.after-container {
    padding: 0;
    margin: 0;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 2;
    /* content is clipped by clip-path in inline style */
}

.after {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: fill;
    /* Stretch to fill exactly the 'before' image box */
}

/* Slider elements */
.slider-handle {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 40px;
    /* Wider hit area for easy grabbing */
    transform: translateX(-50%);
    /* Center the hit area */
    z-index: 10;
    pointer-events: auto;
    /* Enable interaction */
    display: flex;
    justify-content: center;
    cursor: col-resize;
}

.line {
    width: 2px;
    background: white;
    height: 100%;
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
    margin-left: -1px;
}

.handle-button {
    position: absolute;
    top: 50%;
    /* left: 0; */
    /* Removed as it's centered by flex */
    transform: translate(0, -50%);
    /* Adjusted for flex centering */
    width: 24px;
    height: 24px;
    background: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #333;
    font-size: 0.8rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
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
