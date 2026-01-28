export interface ModelInfo {
    id: string;
    name: string;
    pollenPerImage: number; // approximate pollen cost per image
    isNew?: boolean;
}

export const models: ModelInfo[] = [
    { id: 'flux', name: 'Flux Schnell', pollenPerImage: 0.0002 },
    { id: 'zimage', name: 'Z-Image Turbo', pollenPerImage: 0.0002 },
    { id: 'turbo', name: 'SDXL Turbo', pollenPerImage: 0.0003 },
];

export const defaultModel = 'zimage';

export const getModelById = (id: string): ModelInfo | undefined => {
    return models.find(m => m.id === id);
};
