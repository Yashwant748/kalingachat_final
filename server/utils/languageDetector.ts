export type DetectedLanguage = "hindi" | "english" | "mixed";

/**
 * Lightweight, regex-based utility to detect if a message
 * is predominantly Hindi (Devanagari scripts or common transliterations),
 * English, or Mixed.
 */
export function detectLanguage(text: string): DetectedLanguage {
    if (!text || text.trim().length === 0) return "english";

    // 1. Check for Devanagari script (Hindi characters)
    const devanagariRegex = /[\u0900-\u097F]/;
    if (devanagariRegex.test(text)) {
        // If it has Devanagari, we strongly assume Hindi. 
        // We could count the frequency for 'mixed', but a presence usually implies Hindi response expected.
        return "hindi";
    }

    // 2. Check for common Hinglish/Romanized Hindi terms.
    // This is heuristics. We only match complete words to avoid false positives.
    const hinglishWords = [
        "hai", "mera", "kya", "kaise", "kaisa", "hoga", "batao", "karo", "ka", "ki", "ko", "se",
        "aur", "nahi", "haan", "acha", "theek", "bhai", "yaar", "kal", "aaj", "din",
        "raha", "aap", "aapka", "tum", "tumhara", "main", "mera", "mujhe", "hum"
    ];

    // Convert text to lowercase words
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];

    let hinglishCount = 0;

    for (const word of words) {
        if (hinglishWords.includes(word)) {
            hinglishCount++;
        }
    }

    // Determine ratio of Hindi words to total words
    const totalWords = words.length;
    if (totalWords === 0) return "english";

    const hinglishRatio = hinglishCount / totalWords;

    if (hinglishRatio > 0.4) {
        return "hindi";
    } else if (hinglishRatio > 0.1 && hinglishRatio <= 0.4) {
        return "mixed";
    }

    // Default fallback
    return "english";
}
