// Translation utility using free translation API
export async function translateToEnglish(text: string, fromLang: 'vi' | 'en'): Promise<string> {
    if (fromLang === 'en' || !text.trim()) {
        return text;
    }

    try {
        // Using LibreTranslate API (free, no key required)
        // Fallback: Google Translate via unofficial endpoint
        const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=en&dt=t&q=` + encodeURIComponent(text));

        if (!response.ok) {
            console.warn('Translation failed, using original text');
            return text;
        }

        const data = await response.json();
        // Google Translate returns nested array structure
        const translated = data[0]?.map((item: string[]) => item[0]).join('') || text;
        return translated;
    } catch (error) {
        console.error('Translation error:', error);
        return text; // Fallback to original text
    }
}
