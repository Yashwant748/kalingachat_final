/**
 * Detects the language requested by the user based on simple keyword matching.
 * Optimized for performance using pure JavaScript.
 * 
 * @param message The raw user message
 * @returns Object containing the detected language (lowercase)
 */
export function detectLanguageRequest(message: string): { language: string } {
    if (!message || typeof message !== 'string') {
        return { language: 'english' };
    }

    const msgLower = message.toLowerCase();

    // Check for Hindi Script (Devanagari)
    const hindiRegex = /[\u0900-\u097F]/;
    if (hindiRegex.test(message)) {
        return { language: 'hindi' };
    }

    // Check for specific language keywords
    if (msgLower.includes('hinglish')) {
        return { language: 'hinglish' };
    }
    if (msgLower.includes('hindi')) {
        return { language: 'hindi' };
    }
    if (msgLower.includes('spanish')) {
        return { language: 'spanish' };
    }
    if (msgLower.includes('french')) {
        return { language: 'french' };
    }
    if (msgLower.includes('marathi')) {
        return { language: 'marathi' };
    }

    // Default fallback
    return { language: 'english' };
}
