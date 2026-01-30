<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGeneratorStore, type GeneratedImage } from '../stores/generatorStore';
import Button from 'primevue/button';
import SelectButton from 'primevue/selectbutton';
import ConfirmDialog from 'primevue/confirmdialog';
import Toast from 'primevue/toast';
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";

const store = useGeneratorStore();
const confirm = useConfirm();
const toast = useToast();

// Expand state (1 row vs 2 rows)
const isExpanded = ref(false);

// Sort state
const sortBy = ref<'date' | 'seed' | 'likes'>('date');
const sortOptions = [
    { icon: 'pi pi-calendar', value: 'date' },
    { icon: 'pi pi-hashtag', value: 'seed' },
    { icon: 'pi pi-heart-fill', value: 'likes', color: 'var(--p-red-500)' }
];

// Multi-select state
const selectedIds = ref<Set<string>>(new Set());

// Sorted images
const images = computed(() => {
    const imgs = store.selectedGroup?.images || [];
    if (sortBy.value === 'seed') {
        return [...imgs].sort((a, b) => a.seed - b.seed);
    }
    if (sortBy.value === 'likes') {
        return [...imgs].sort((a, b) => (b.likes || 0) - (a.likes || 0));
    }
    return [...imgs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
});

const isSelected = (id: string) => selectedIds.value.has(id);

const toggleSelect = (id: string, event: Event) => {
    event.stopPropagation();
    if (selectedIds.value.has(id)) {
        selectedIds.value.delete(id);
    } else {
        selectedIds.value.add(id);
    }
    selectedIds.value = new Set(selectedIds.value);

    // Also select the image for preview
    const img = store.selectedGroup?.images.find(i => i.id === id);
    if (img && img.status === 'completed') {
        store.selectImage(img);
    }
};

const selectImage = (img: GeneratedImage) => {
    if (img.status === 'completed') {
        store.selectImage(img);
    }
};

const handleDeleteSingle = (event: MouseEvent, id: string) => {
    event.stopPropagation();

    // Select the image for preview before/during deletion
    const img = store.selectedGroup?.images.find(i => i.id === id);
    if (img && img.status === 'completed') {
        store.selectImage(img);
    }

    confirm.require({
        message: 'Delete this image?',
        header: 'Confirm Delete',
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'p-button-danger',
        accept: async () => {
            await store.deleteImages([id]);
            selectedIds.value.delete(id);
            toast.add({ severity: 'success', summary: 'Deleted', detail: 'Image removed', life: 2000 });
        }
    });
};

const handleDeleteSelected = () => {
    if (selectedIds.value.size === 0) return;
    confirm.require({
        message: `Delete ${selectedIds.value.size} selected images?`,
        header: 'Confirm Bulk Delete',
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'p-button-danger',
        accept: async () => {
            await store.deleteImages(Array.from(selectedIds.value));
            selectedIds.value.clear();
            toast.add({ severity: 'success', summary: 'Deleted', detail: 'Images removed', life: 2000 });
        }
    });
};

const clearSelection = () => {
    selectedIds.value.clear();
};

// Heart functionality
const hearts = ref<{ id: number; x: number; y: number; scale: number; duration: number; drift: number }[]>([]);
let heartId = 0;

const handleLike = (event: MouseEvent, id: string) => {
    event.stopPropagation();

    // Select the image for preview
    const img = store.selectedGroup?.images.find(i => i.id === id);
    if (img && img.status === 'completed') {
        store.selectImage(img);
    }

    store.likeImage(id);

    // Add multiple flying hearts (explosion effect)
    const heartCount = 6;
    for (let i = 0; i < heartCount; i++) {
        const newHeart = {
            id: heartId++,
            x: event.clientX + (Math.random() * 40 - 20), // Random horizontal spread
            y: event.clientY,
            scale: 0.5 + Math.random() * 1.5, // Varied sizes
            duration: 0.8 + Math.random() * 0.7, // Varied speeds
            drift: Math.random() * 100 - 50 // Random horizontal drift
        };
        hearts.value.push(newHeart);

        // Remove heart after its animation
        setTimeout(() => {
            hearts.value = hearts.value.filter(h => h.id !== newHeart.id);
        }, newHeart.duration * 1000);
    }
};

const clickState = ref({ id: '', count: 0, lastTime: 0 });

const handleUnlike = (event: MouseEvent, id: string) => {
    event.stopPropagation();

    // Select the image for preview
    const img = store.selectedGroup?.images.find(i => i.id === id);
    if (img && img.status === 'completed') {
        store.selectImage(img);
    }

    const now = Date.now();
    if (clickState.value.id === id && (now - clickState.value.lastTime) < 500) {
        clickState.value.count++;
    } else {
        clickState.value.id = id;
        clickState.value.count = 1;
    }
    clickState.value.lastTime = now;

    if (clickState.value.count === 3) {
        store.resetLikes(id);
        toast.add({ severity: 'info', summary: 'Reset', detail: 'Likes reset to 0', life: 1500 });
        clickState.value.count = 0; // Reset after trigger
    } else {
        store.unlikeImage(id);
    }
};
</script>

<template>
    <div class="history-panel" :class="{ expanded: isExpanded }">
        <ConfirmDialog />
        <Toast />

        <!-- Header -->
        <div class="history-header">
            <div class="header-info">
                <Button :icon="isExpanded ? 'pi pi-chevron-down' : 'pi pi-chevron-up'" size="small" severity="secondary"
                    text @click="isExpanded = !isExpanded" v-tooltip="isExpanded ? 'Collapse' : 'Expand'"
                    class="expand-toggle" />
                <span class="title">Seeds</span>
                <span class="count" v-if="images.length > 0"
                    style="display: flex; align-items: center; gap: 0.2rem; color: var(--p-surface-400);">
                    <i class="pi pi-image" style="font-size: 0.7rem;"></i>
                    {{ images.length }}
                </span>
            </div>
            <div class="header-actions">
                <div class="actions-group" v-if="selectedIds.size > 0">
                    <span class="hint">{{ selectedIds.size }} selected</span>
                    <Button icon="pi pi-times" size="small" severity="secondary" text @click="clearSelection"
                        v-tooltip="'Clear'" class="header-btn" />
                    <Button icon="pi pi-trash" size="small" severity="danger" @click="handleDeleteSelected"
                        v-tooltip="'Delete'" class="header-btn" />
                </div>
                <SelectButton v-model="sortBy" :options="sortOptions" optionLabel="value" optionValue="value"
                    :allowEmpty="false" size="small" class="sort-btn">
                    <template #option="slotProps">
                        <i :class="slotProps.option.icon" :style="{ color: slotProps.option.color }"></i>
                    </template>
                </SelectButton>
            </div>
        </div>

        <!-- Image grid -->
        <div class="history-grid">
            <div v-for="img in images" :key="img.id" @click="selectImage(img)" class="history-item"
                :class="{ selected: store.selectedImage?.id === img.id }">

                <template v-if="img.status === 'pending'">
                    <div class="skeleton-item"></div>
                    <div class="overlay" style="opacity: 1;">Generating...</div>
                </template>

                <template v-else-if="img.status === 'failed'">
                    <div class="failed-item">
                        <i class="pi pi-exclamation-triangle"></i>
                    </div>
                    <!-- Synchronized Selection Mark -->
                    <div class="checkbox-wrapper" :class="{ 'is-selected': isSelected(img.id) }"
                        @click="toggleSelect(img.id, $event)">
                        <i v-if="isSelected(img.id)" class="pi pi-check selection-tick"></i>
                    </div>
                    <button @click="handleDeleteSingle($event, img.id)" class="delete-btn" style="opacity: 1;">
                        <i class="pi pi-times" style="font-size: 0.75rem;"></i>
                    </button>
                </template>

                <template v-else>
                    <img :src="img.path" />
                    <!-- Synchronized Selection Mark -->
                    <div class="checkbox-wrapper" :class="{ 'is-selected': isSelected(img.id) }"
                        @click="toggleSelect(img.id, $event)">
                        <i v-if="isSelected(img.id)" class="pi pi-check selection-tick"></i>
                    </div>
                    <!-- Seed in center on hover -->
                    <div class="seed-overlay">{{ String(img.seed) }}</div>
                    <!-- Delete top-right -->
                    <button @click="handleDeleteSingle($event, img.id)" class="delete-btn">
                        <i class="pi pi-times" style="font-size: 0.75rem;"></i>
                    </button>
                    <!-- Likes badge (always visible if > 0) -->
                    <div v-if="img.likes > 0" class="likes-badge">
                        <i class="pi pi-heart-fill"></i>
                        <span>{{ img.likes }}</span>
                    </div>
                    <!-- Heart bottom-left -->
                    <button class="heart-btn" @click="handleLike($event, img.id)">
                        <i class="pi pi-heart-fill" style="font-size: 0.7rem;"></i>
                    </button>
                    <!-- Triple-click to reset -->
                    <button class="unheart-btn" @click="handleUnlike($event, img.id)"
                        v-tooltip.left="'Click 3x to reset'">
                        <i class="pi pi-heart-fill" style="font-size: 0.7rem;"></i>
                    </button>
                </template>
            </div>
        </div>

        <div v-if="!store.selectedGroup" class="empty-state">
            <i class="pi pi-arrow-left"></i>
            <span>Select a prompt</span>
        </div>

        <div v-else-if="images.length === 0" class="empty-state">
            <i class="pi pi-images"></i>
            <span>No images</span>
        </div>

        <!-- Flying Hearts Portal -->
        <Teleport to="body">
            <div v-for="heart in hearts" :key="heart.id" class="floating-heart" :style="{
                left: heart.x + 'px',
                top: heart.y + 'px',
                '--drift': heart.drift + 'px',
                '--duration': heart.duration + 's',
                '--target-scale': heart.scale
            }">
                <i class="pi pi-heart-fill"></i>
            </div>
        </Teleport>
    </div>
</template>

<style scoped>
.history-panel {
    display: flex;
    flex-direction: column;
    height: 11rem;
    min-height: 0;
    transition: height 0.2s ease;
    gap: 0rem;
}

.history-panel.expanded {
    height: 30rem;
}

.history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    border-bottom: 1px solid var(--p-surface-700);
    width: 100%;
}

.header-info {
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.actions-group {
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.header-btn {
    width: 1.75rem !important;
    height: 1.75rem !important;
    padding: 0 !important;
}

.title {
    font-weight: 700;
    font-size: 0.85rem;
    color: var(--p-surface-200);
}

.count {
    font-size: 0.75rem;
    color: var(--p-surface-500);
    font-style: italic;
    margin-left: 0.25rem;
}

.sort-btn {
    flex-shrink: 0;
}

.sort-btn :deep(.p-selectbutton-button) {
    height: 1.75rem;
    padding: 0 0.5rem;
}

.expand-toggle {
    width: 1.75rem !important;
    height: 1.75rem !important;
}

.hint {
    font-size: 0.7rem;
    color: var(--p-primary-color);
    font-weight: 600;
}

.history-grid {
    flex: 1;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.75rem;
    overflow-y: auto;
    overflow-x: hidden;
    align-items: flex-start;
    align-content: flex-start;
    width: 100%;
}

.history-item {
    position: relative;
    width: 6.5rem;
    height: 6.5rem;
    flex-shrink: 0;
    border-radius: 0.4rem;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s;
}

.history-item:hover {
    transform: scale(1.02);
}

.history-item.selected {
    box-shadow: 0 0 0 2px var(--p-primary-color);
}

.history-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.check-icon {
    font-size: 1.2rem;
    color: var(--p-primary-color);
}

.seed-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 0.2rem 0.4rem;
    border-radius: 0.25rem;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    font-size: 0.6rem;
    opacity: 0;
    transition: opacity 0.15s;
    pointer-events: none;
}

.history-item:hover .seed-overlay {
    opacity: 1;
}

.likes-badge {
    position: absolute;
    bottom: 0.15rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 0.1rem;
    padding: 0.1rem 0.25rem;
    border-radius: 0.25rem;
    background: rgba(0, 0, 0, 0.7);
    color: var(--p-red-400);
    font-size: 0.55rem;
}

.likes-badge i {
    font-size: 0.5rem;
}

.skeleton-item {
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, var(--p-surface-700) 25%, var(--p-surface-600) 50%, var(--p-surface-700) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
    0% {
        background-position: 200% 0;
    }

    100% {
        background-position: -200% 0;
    }
}

.floating-heart {
    position: fixed;
    pointer-events: none;
    z-index: 10000;
    color: #ff3e3e;
    /* Brighter Red */
    font-size: 1.5rem;
    filter: drop-shadow(0 0 5px rgba(255, 62, 62, 0.6));
    animation: floatUp var(--duration) ease-out forwards;
}

@keyframes floatUp {
    0% {
        transform: translateY(0) rotate(0deg) scale(0.3);
        opacity: 0.1;
    }

    30% {
        opacity: 1;
        /* Quick fade in to solid */
    }

    100% {
        transform: translateY(-300px) translateX(var(--drift)) rotate(20deg) scale(var(--target-scale));
        opacity: 0;
    }
}

.failed-item {
    width: 100%;
    height: 100%;
    background: var(--p-surface-700);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--p-red-400);
}

.checkbox-wrapper {
    position: absolute;
    top: 0.25rem;
    left: 0.25rem;
    width: 1.15rem;
    height: 1.15rem;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-radius: 4px;
    opacity: 0;
    transition: opacity 0.15s, border-color 0.15s;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
}

.checkbox-wrapper.is-selected {
    border-color: var(--p-primary-color);
    background: rgba(0, 0, 0, 0.7);
}

.selection-tick {
    color: var(--p-primary-color);
    font-size: 0.85rem;
    font-weight: 900;
    display: block;
    -webkit-text-stroke: 1px var(--p-primary-color);
    /* Extra boldness */
}

.history-item:hover .checkbox-wrapper,
.checkbox-wrapper.is-selected {
    opacity: 1;
}

.delete-btn {
    position: absolute;
    top: 0.15rem;
    right: 0.15rem;
    width: 1rem;
    height: 1rem;
    border: none;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.15s, background-color 0.15s;
}

.history-item:hover .delete-btn {
    opacity: 1;
}

.delete-btn:hover {
    background: var(--p-red-500);
}

.heart-btn {
    position: absolute;
    bottom: 0.15rem;
    left: 0.15rem;
    min-width: 1rem;
    height: 1rem;
    padding: 0 0.2rem;
    border: none;
    border-radius: 0.5rem;
    background: rgba(0, 0, 0, 0.6);
    color: var(--p-red-400);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.1rem;
    opacity: 0;
    transition: opacity 0.15s, background-color 0.15s;
}

.history-item:hover .heart-btn {
    opacity: 1;
}

.heart-btn:hover {
    background: var(--p-red-500);
    color: white;
}

.like-count {
    font-size: 0.6rem;
    color: white;
}

.unheart-btn {
    position: absolute;
    bottom: 0.15rem;
    right: 0.15rem;
    min-width: 1rem;
    height: 1rem;
    padding: 0 0.2rem;
    border: none;
    border-radius: 0.5rem;
    background: rgba(0, 0, 0, 0.6);
    color: var(--p-surface-400);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.15s, background-color 0.15s, color 0.15s;
}

.history-item:hover .unheart-btn {
    opacity: 1;
}

.unheart-btn:hover {
    background: var(--p-surface-500);
    color: white;
}

.overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 0.15rem;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
    color: white;
    font-size: 0.55rem;
    text-align: center;
    opacity: 0;
    transition: opacity 0.15s;
    pointer-events: none;
}

.history-item:hover .overlay {
    opacity: 1;
}

.empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--p-surface-400);
    gap: 0.25rem;
    font-size: 0.8rem;
}

.empty-state i {
    font-size: 1.25rem;
}
</style>
