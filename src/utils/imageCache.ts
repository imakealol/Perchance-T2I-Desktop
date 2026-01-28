const CACHE_NAME = 'image-history-v1';

export const saveToCache = async (id: string, blob: Blob): Promise<void> => {
    try {
        const cache = await caches.open(CACHE_NAME);
        const response = new Response(blob, {
            headers: { 'Content-Type': blob.type }
        });
        await cache.put(`/images/${id}`, response);
    } catch (error) {
        console.error('Failed to save image to cache:', error);
        throw error;
    }
};

export const loadFromCache = async (id: string): Promise<string | null> => {
    try {
        const cache = await caches.open(CACHE_NAME);
        const response = await cache.match(`/images/${id}`);
        if (!response) return null;

        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error('Failed to load image from cache:', error);
        return null;
    }
};

export const deleteFromCache = async (id: string): Promise<void> => {
    try {
        const cache = await caches.open(CACHE_NAME);
        await cache.delete(`/images/${id}`);
    } catch (error) {
        console.error('Failed to delete image from cache:', error);
    }
};
