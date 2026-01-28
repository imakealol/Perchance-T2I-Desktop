import { defineStore } from 'pinia';
import { generateImage } from '../utils/textToImageApi';
import { saveToCache, loadFromCache, deleteFromCache } from '../utils/imageCache';

export interface GeneratorConfig {
    prompt: string;
    negative: string;
    artStyle: string;
    model: string;
    guidanceScale: number;
    width: number;
    height: number;
    count: number;
    seed: number;
    useSeed: boolean;
    language: string;
}

export interface GeneratedImage {
    id: string;
    seed: number;
    path: string; // Transient Object URL
    createdAt: Date;
    status: 'pending' | 'completed' | 'failed';
    likes: number;
}

export interface PromptGroup {
    id: string;
    config: Omit<GeneratorConfig, 'count' | 'seed' | 'useSeed'>; // Config without per-image fields
    images: GeneratedImage[];
    createdAt: Date;
}

// Create a hash key from config (excluding seed, count, useSeed)
function getConfigHash(config: GeneratorConfig): string {
    const { prompt, negative, artStyle, model, guidanceScale, width, height, language } = config;
    return JSON.stringify({ prompt, negative, artStyle, model, guidanceScale, width, height, language });
}

export const useGeneratorStore = defineStore('generator', {
    state: () => ({
        config: {
            prompt: "attractive woman",
            negative: "",
            artStyle: "Painted Anime",
            model: "zimage",
            guidanceScale: 7,
            width: 1024,
            height: 1024,
            count: 3,
            seed: -1,
            useSeed: false,
            language: "en"
        } as GeneratorConfig,
        promptGroups: [] as PromptGroup[],
        selectedGroup: null as PromptGroup | null,
        selectedImage: null as GeneratedImage | null,
        isGenerating: false,
    }),
    getters: {
        // Get sorted groups
        sortedGroups: (state) => (sortBy: 'date' | 'alpha') => {
            const groups = [...state.promptGroups];
            if (sortBy === 'alpha') {
                return groups.sort((a, b) => a.config.prompt.localeCompare(b.config.prompt));
            }
            return groups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        },
        // Get newest image from a group (for thumbnail)
        getGroupThumbnail: () => (group: PromptGroup): GeneratedImage | null => {
            const completed = group.images.filter(img => img.status === 'completed');
            return completed.length > 0 ? completed[0] : null;
        }
    },
    actions: {
        updateConfig(newConfig: Partial<GeneratorConfig>) {
            this.config = { ...this.config, ...newConfig };
        },

        findOrCreateGroup(config: GeneratorConfig): PromptGroup {
            const hash = getConfigHash(config);
            let group = this.promptGroups.find(g => getConfigHash(g.config as GeneratorConfig) === hash);

            if (!group) {
                const { prompt, negative, artStyle, model, guidanceScale, width, height, language } = config;
                group = {
                    id: crypto.randomUUID(),
                    config: { prompt, negative, artStyle, model, guidanceScale, width, height, language },
                    images: [],
                    createdAt: new Date()
                };
                this.promptGroups.unshift(group);
            }
            return group;
        },

        addImageToGroup(groupId: string, image: GeneratedImage) {
            const group = this.promptGroups.find(g => g.id === groupId);
            if (group) {
                group.images.unshift(image);
                // Update group's createdAt to newest
                group.createdAt = new Date();
                // Auto-select
                if (!this.selectedGroup) {
                    this.selectedGroup = group;
                }
                if (!this.selectedImage || image.status === 'pending') {
                    this.selectedImage = image;
                }
            }
        },

        updateGroupImage(groupId: string, imageId: string, updates: Partial<GeneratedImage>) {
            const group = this.promptGroups.find(g => g.id === groupId);
            if (group) {
                const imgIndex = group.images.findIndex(img => img.id === imageId);
                if (imgIndex !== -1) {
                    group.images[imgIndex] = { ...group.images[imgIndex], ...updates };
                    if (this.selectedImage && this.selectedImage.id === imageId) {
                        this.selectedImage = group.images[imgIndex];
                    }
                }
            }
        },

        selectGroup(group: PromptGroup | null) {
            this.selectedGroup = group;
            if (group) {
                // Sync config so UI reflects selection
                this.config = {
                    ...this.config,
                    ...group.config
                };
                if (group.images.length > 0) {
                    const completed = group.images.filter(img => img.status === 'completed');
                    this.selectedImage = completed.length > 0 ? completed[0] : group.images[0];
                    if (this.selectedImage) {
                        this.config.seed = this.selectedImage.seed;
                    }
                } else {
                    this.selectedImage = null;
                }
            } else {
                this.selectedImage = null;
            }
        },

        selectImage(image: GeneratedImage | null) {
            this.selectedImage = image;
        },

        async deletePromptGroup(groupId: string) {
            const index = this.promptGroups.findIndex(g => g.id === groupId);
            if (index !== -1) {
                const group = this.promptGroups[index];
                // Delete all images from cache
                for (const img of group.images) {
                    try {
                        await deleteFromCache(img.id);
                    } catch (e) {
                        console.error("Failed to delete from cache", e);
                    }
                }
                this.promptGroups.splice(index, 1);

                // Update selection
                if (this.selectedGroup?.id === groupId) {
                    this.selectedGroup = this.promptGroups.length > 0 ? this.promptGroups[0] : null;
                    if (this.selectedGroup && this.selectedGroup.images.length > 0) {
                        this.selectedImage = this.selectedGroup.images[0];
                    } else {
                        this.selectedImage = null;
                    }
                }
            }
        },

        async deleteImages(imageIds: string[]) {
            if (!this.selectedGroup) return;

            for (const id of imageIds) {
                const imgIndex = this.selectedGroup.images.findIndex(img => img.id === id);
                if (imgIndex !== -1) {
                    this.selectedGroup.images.splice(imgIndex, 1);
                    try {
                        await deleteFromCache(id);
                    } catch (e) {
                        console.error("Failed to delete from cache", e);
                    }
                }
            }

            // If group is now empty, delete the group
            if (this.selectedGroup.images.length === 0) {
                await this.deletePromptGroup(this.selectedGroup.id);
            } else {
                // Update selected image
                if (this.selectedImage && imageIds.includes(this.selectedImage.id)) {
                    this.selectedImage = this.selectedGroup.images[0] || null;
                }
            }
        },

        async loadHistoryImages() {
            // Initially clear paths to avoid broken stale Object URLs from previous session
            this.promptGroups.forEach(g => g.images.forEach(img => img.path = ''));

            const promises: Promise<void>[] = [];
            for (const group of this.promptGroups) {
                for (const img of group.images) {
                    if (img.status === 'completed') {
                        promises.push((async () => {
                            const url = await loadFromCache(img.id);
                            if (url) {
                                img.path = url;
                            } else {
                                img.status = 'failed';
                            }
                        })());
                    }
                }
            }
            await Promise.all(promises);

            // Auto-select latest group (top of list)
            if (this.promptGroups.length > 0) {
                this.selectGroup(this.promptGroups[0]);
            }
        },

        async generate() {
            if (this.isGenerating) return;
            this.isGenerating = true;

            try {
                // Translate prompt if Vietnamese
                let translatedPrompt = this.config.prompt;
                let translatedNegative = this.config.negative;

                if (this.config.language === 'vi') {
                    const { translateToEnglish } = await import('../utils/translate');
                    translatedPrompt = await translateToEnglish(this.config.prompt, 'vi');
                    if (this.config.negative) {
                        translatedNegative = await translateToEnglish(this.config.negative, 'vi');
                    }
                }

                // Prepare config for API (translated)
                const apiConfig = {
                    ...this.config,
                    prompt: translatedPrompt,
                    negative: translatedNegative
                };

                // Find or create the group for this config (using ORIGINAL prompt/language)
                // This ensures we save what the user typed, not what we sent to the API
                const group = this.findOrCreateGroup(this.config);
                this.selectedGroup = group;

                const count = this.config.count;
                const promises: Promise<void>[] = [];

                for (let i = 0; i < count; i++) {
                    const baseSeed = this.config.useSeed ? this.config.seed : -1;
                    const seed = baseSeed === -1 ? Math.floor(Math.random() * 2147483647) : baseSeed + i;

                    // Create pending image
                    const tempId = crypto.randomUUID();
                    const pendingImage: GeneratedImage = {
                        id: tempId,
                        seed,
                        path: '',
                        createdAt: new Date(),
                        status: 'pending',
                        likes: 0
                    };
                    this.addImageToGroup(group.id, pendingImage);

                    promises.push((async () => {
                        try {
                            const blob = await generateImage({ ...apiConfig, seed });
                            if (blob) {
                                await saveToCache(tempId, blob);
                                const objectUrl = URL.createObjectURL(blob);
                                this.updateGroupImage(group.id, tempId, {
                                    path: objectUrl,
                                    status: 'completed'
                                });
                            } else {
                                throw new Error("No image blob returned");
                            }
                        } catch (e) {
                            console.error("Single image generation failed", e);
                            this.updateGroupImage(group.id, tempId, { status: 'failed' });
                        }
                    })());
                }

                await Promise.all(promises);

            } catch (error) {
                console.error("Generation batch failed:", error);
            } finally {
                this.isGenerating = false;
            }
        },

        restore(group: PromptGroup, image?: GeneratedImage) {
            // Restore config from group
            this.config = {
                ...this.config,
                ...group.config,
                seed: image?.seed ?? -1
            };
            this.selectedGroup = group;
            if (image) {
                this.selectedImage = image;
            }
        },

        likeImage(imageId: string) {
            if (!this.selectedGroup) return;
            const img = this.selectedGroup.images.find(i => i.id === imageId);
            if (img) {
                img.likes = (img.likes || 0) + 1;
            }
        },

        unlikeImage(imageId: string) {
            if (!this.selectedGroup) return;
            const img = this.selectedGroup.images.find(i => i.id === imageId);
            if (img && img.likes > 0) {
                img.likes--;
            }
        },

        resetLikes(imageId: string) {
            if (!this.selectedGroup) return;
            const img = this.selectedGroup.images.find(i => i.id === imageId);
            if (img) {
                img.likes = 0;
            }
        }
    }
});
