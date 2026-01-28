<script setup lang="ts">
import { onMounted } from 'vue';
import ControlPanel from './components/ControlPanel.vue';
import PromptList from './components/PromptList.vue';
import ImagePreview from './components/ImagePreview.vue';
import HistoryPanel from './components/HistoryPanel.vue';
import { useGeneratorStore } from './stores/generatorStore';

const store = useGeneratorStore();

onMounted(() => {
    store.loadHistoryImages();
});
</script>

<template>
    <div class="app-layout">
        <!-- Left sidebar: Controls + Prompt List (vertical split) -->
        <div class="left-sidebar">
            <ControlPanel class="control-section" />
            <PromptList class="prompt-section" />
        </div>

        <!-- Main area: Preview + History -->
        <div class="main-area">
            <ImagePreview class="preview-area" />
            <HistoryPanel class="history-area" />
        </div>
    </div>
</template>

<style>
.app-layout {
    display: flex;
    height: 100vh;
    background: var(--p-surface-900);
    color: var(--p-surface-0);
}

.left-sidebar {
    width: 20rem;
    display: flex;
    flex-direction: column;
    background: var(--p-surface-800);
    border-right: 1px solid var(--p-surface-700);
}

.control-section {
    padding: 1rem;
    border-bottom: 1px solid var(--p-surface-700);
}

.prompt-section {
    flex: 1;
    min-height: 0;
}

.main-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.preview-area {
    flex: 1;
    min-height: 0;
}

.history-area {
    border-top: 1px solid var(--p-surface-700);
    background: var(--p-surface-800);
}
</style>
