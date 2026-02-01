<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useGeneratorStore } from '../stores/generatorStore';
import ProgressSpinner from 'primevue/progressspinner';
import Button from 'primevue/button';
import UpscaleDialog from './UpscaleDialog.vue';
import UpscaleDialogV2 from './UpscaleDialogV2.vue';
import { saveImageWithDialog, isTauri } from '../utils/saveImage';

const store = useGeneratorStore();

const isTauriApp = isTauri();

// Zoom and Pan State
const scale = ref(1);
const offset = ref({ x: 0, y: 0 });
const isDragging = ref(false);
const startPos = ref({ x: 0, y: 0 });

// Upscale Dialog State
const showUpscaleDialog = ref(false);
const showUpscaleDialogV2 = ref(false);

// Reset zoom when image changes
watch(() => store.selectedImage?.id, () => {
    resetZoom();
});

const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();

    // Mouse position relative to the container (0,0 is top-left)
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    // Limit between 1% (0.01) and 999% (9.99)
    const newScale = Math.min(Math.max(scale.value * delta, 0.01), 9.99);

    // world_pos = (mouse_pos - current_offset) / current_scale
    const worldX = (x - offset.value.x) / scale.value;
    const worldY = (y - offset.value.y) / scale.value;

    // new_offset = mouse_pos - (world_pos * new_scale)
    offset.value = {
        x: x - worldX * newScale,
        y: y - worldY * newScale
    };

    scale.value = newScale;
};

const handleMouseDown = (e: MouseEvent) => {
    // Allow panning if zoomed in or even at 1x if user wants to move standard view
    if (scale.value > 1 || true) {
        isDragging.value = true;
        startPos.value = { x: e.clientX - offset.value.x, y: e.clientY - offset.value.y };
    }
};

const handleMouseMove = (e: MouseEvent) => {
    if (isDragging.value) {
        offset.value = {
            x: e.clientX - startPos.value.x,
            y: e.clientY - startPos.value.y
        };
    }
};

const handleMouseUp = () => {
    isDragging.value = false;
};

const resetZoom = () => {
    scale.value = 1;
    offset.value = { x: 0, y: 0 };
};

const layerStyle = computed(() => ({
    transform: `translate(${offset.value.x}px, ${offset.value.y}px) scale(${scale.value})`,
    cursor: isDragging.value ? 'grabbing' : 'grab',
    transition: isDragging.value ? 'none' : 'transform 0.1s ease-out',
    transformOrigin: '0 0',
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
}));

// Get dimensions from selected group's config
const dimensions = computed(() => {
    if (store.selectedGroup) {
        return `${store.selectedGroup.config.width}x${store.selectedGroup.config.height}`;
    }
    return '';
});

const handleDownload = async () => {
    if (!store.selectedImage) return;
    try {
        await saveImageWithDialog({
            sourceUrl: store.selectedImage.path,
            defaultFileName: `perchance-${store.selectedImage.seed}.png`
        });
    } catch (error) {
        console.error('Failed to save image', error);
    }
};
</script>

<template>
    <div class="preview-container" @wheel="handleWheel" @mousedown="handleMouseDown" @mousemove="handleMouseMove"
        @mouseup="handleMouseUp" @mouseleave="handleMouseUp">
        <div v-if="store.selectedImage" class="viewport">

            <div v-if="store.selectedImage.status === 'pending'" class="centered-content">
                <ProgressSpinner />
                <p>Generating...</p>
            </div>

            <div v-else-if="store.selectedImage.status === 'failed'" class="centered-content"
                style="color: var(--p-red-500);">
                <i class="pi pi-exclamation-triangle" style="font-size: 3rem;"></i>
                <p style="font-size: 1.25rem;">Generation Failed</p>
            </div>

            <template v-else>
                <!-- Zoom Layer Wrapper -->
                <div class="zoom-layer" :style="layerStyle">
                    <img :src="store.selectedImage.path" alt="Generated Image" class="preview-image"
                        @dragstart.prevent />
                </div>

                <!-- Corner Overlays -->
                <div class="overlay top-left" :style="{ opacity: store.selectedImage.likes > 0 ? 1 : 0.7 }">
                    <i class="pi pi-heart-fill"
                        :style="{ color: store.selectedImage.likes > 0 ? 'var(--p-red-500)' : 'var(--p-surface-600)' }"></i>
                    {{ store.selectedImage.likes || 0 }}
                </div>

                <div class="overlay bottom-left">
                    {{ dimensions }}
                </div>

                <div class="overlay bottom-right">
                    Seed: {{ String(store.selectedImage.seed) }}
                </div>

                <div class="action-controls" v-if="store.selectedImage.status === 'completed'">
                    <Button v-if="!isTauriApp" icon="pi pi-bolt" severity="primary" rounded size="small"
                        @click="showUpscaleDialog = true" v-tooltip.left="'Upscale Image (WebSR)'" />
                    <Button v-if="isTauriApp" icon="pi pi-arrow-up" severity="info" rounded size="small"
                        @click="showUpscaleDialogV2 = true" v-tooltip.left="'Upscale Image (RealESRGAN)'" />
                    <Button icon="pi pi-download" severity="secondary" rounded size="small" @click="handleDownload"
                        v-tooltip.left="'Download Image'" />
                    <Button v-if="scale !== 1" icon="pi pi-refresh" severity="secondary" rounded size="small"
                        @click="resetZoom" v-tooltip.left="'Reset Zoom'" />
                    <span v-if="scale !== 1" class="zoom-level">{{ Math.round(scale * 100) }}%</span>
                </div>
            </template>
        </div>
        <div v-else class="centered-content">
            <i class="pi pi-image" style="font-size: 3rem; color: var(--p-surface-500);"></i>
            <p style="font-size: 1.25rem; color: var(--p-surface-400);">Ready to generate</p>
        </div>

        <UpscaleDialog v-model:visible="showUpscaleDialog" :imageSrc="store.selectedImage?.path || null" />
        <UpscaleDialogV2 v-model:visible="showUpscaleDialogV2" :imageSrc="store.selectedImage?.path || null" />
    </div>
</template>


<style scoped>
.preview-container {
    width: 100%;
    height: 100%;
    position: relative;
    background: var(--p-surface-900);
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
}

.viewport {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
}

.centered-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 1rem;
}

.zoom-layer {
    /* Layer managed by inline styles */
}

.preview-image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    user-select: none;
    -webkit-user-drag: none;
    /* Default smooth scaling */
}

.overlay {
    position: absolute;
    background: rgba(0, 0, 0, 0.6);
    padding: 0.25rem 0.65rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    color: white;
    backdrop-filter: blur(4px);
    pointer-events: none;
    z-index: 5;
    display: flex;
    align-items: center;
    gap: 0.35rem;
}

.top-left {
    top: 0.75rem;
    left: 0.75rem;
    font-weight: 600;
}

.bottom-left {
    bottom: 0.75rem;
    left: 0.75rem;
}

.bottom-right {
    bottom: 0.75rem;
    right: 0.75rem;
}

.action-controls {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    z-index: 5;
}

.zoom-level {
    background: rgba(0, 0, 0, 0.6);
    color: white;
    padding: 0.15rem 0.5rem;
    border-radius: 0.5rem;
    font-size: 0.7rem;
    font-weight: 600;
    min-width: 3.5em;
    /* Fixed width to prevent layout shift */
    display: inline-block;
    text-align: center;
}
</style>
