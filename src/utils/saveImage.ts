const isTauri = () => {
    return '__TAURI__' in window;
};

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
    const [_, base64Data] = dataUrl.split(',');
    if (!base64Data) {
        throw new Error('Invalid data URL');
    }
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

function arrayBufferToUint8Array(buffer: ArrayBuffer): Uint8Array {
    return new Uint8Array(buffer);
}

// Web fallback download
async function downloadWeb(url: string, filename: string) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export async function saveImageWithDialog(options: {
    dataUrl?: string | null;
    sourceUrl?: string | null;
    defaultFileName: string;
}) {
    if (!isTauri()) {
        // Web Environment
        const url = options.dataUrl || options.sourceUrl;
        if (!url) throw new Error('No image data provided');

        await downloadWeb(url, options.defaultFileName);
        return;
    }

    // Tauri Environment
    // Dynamic import to avoid issues in browser
    try {
        const { save } = await import('@tauri-apps/plugin-dialog');
        const { writeFile } = await import('@tauri-apps/plugin-fs');

        const filePath = await save({
            defaultPath: options.defaultFileName,
            filters: [{ name: 'PNG Image', extensions: ['png'] }]
        });

        if (!filePath) return;

        const normalizedPath = filePath.replace(/^\\\?\\/, '');

        let bytes: Uint8Array;
        if (options.dataUrl) {
            bytes = dataUrlToUint8Array(options.dataUrl);
        } else if (options.sourceUrl) {
            const response = await fetch(options.sourceUrl);
            const buffer = await response.arrayBuffer();
            bytes = arrayBufferToUint8Array(buffer);
        } else {
            throw new Error('No image data provided');
        }

        await writeFile(normalizedPath, bytes);
    } catch (e) {
        console.error('Tauri save failed:', e);
        // Fallback or re-throw? 
        // If it failed because import failed (unlikely if isTauri checked correct), then maybe fallback?
        // But for now just log.
        throw e;
    }
}