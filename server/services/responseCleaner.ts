/**
 * Scrubs LLM responses (especially chaotic offline models like TinyLLaMA)
 * to remove unwanted prefixes, artifacts, or mixed languages.
 * 
 * @param text Raw response text from the model
 * @returns Cleaned response text
 */
export function cleanResponse(text: string): string {
    if (!text) return text;

    let cleaned = text.trim();

    // Remove markdown blocks if they are wrapping standard text
    cleaned = cleaned.replace(/```\s*```/g, '');

    // Basic cleanup of excessive newlines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // Remove known leakage patterns anywhere in the text
    const leakPatterns = [
        /EDITORIAL:\s*/gi,
        /SYSTEM:\s*/gi,
        /INSTRUCTION:\s*/gi,
        /Output natively[^\n]*/gi,
        /Do NOT use[^\n]*/gi,
        /As required/gi,
        /^System:?\s*/gim,
        /^Assistant:?\s*/gim,
        /^Instruction:?\s*/gim,
        /\[Scope:.*?\]/gi,
        /\[CRITICAL RULE\]:/gi,
        /\[SIMPLE EXPLANATION MODE\]/gi
    ];

    for (const pattern of leakPatterns) {
        cleaned = cleaned.replace(pattern, '').trim();
    }

    // Remove System Prompt Leakages (prefixes)
    const badPrefixes = [
        "You are KalingaAI",
        "You are JARVIS",
        "IDENTITY:",
        "PROTOCOL:",
        "CRITICAL INSTRUCTIONS:",
        "CRITICAL RULE:",
        "I am not sure",
        "I may be wrong",
        "As an AI",
        "As a language model",
        "Here is the code:",
        "Here are some ideas:",
        "Here are some general tips:",
        "I cannot provide specific ideas",
        "[SIMPLE EXPLANATION MODE]",
        "CRITICAL STRUCTURE:",
        "DEFAULT JARVIS",
        "Here is a short explanation:"
    ];

    for (const prefix of badPrefixes) {
        // Remove if it starts with this
        if (cleaned.toLowerCase().startsWith(prefix.toLowerCase())) {
            cleaned = cleaned.substring(prefix.length).trim();
            // Clean up any remaining colon or dash at start
            if (cleaned.startsWith(":") || cleaned.startsWith("-")) {
                cleaned = cleaned.substring(1).trim();
            }
        }
    }

    // Truncate extremely long responses (safety limit ~1500 words)
    const words = cleaned.split(/\s+/);
    if (words.length > 1500) {
        cleaned = words.slice(0, 1500).join(' ') + "\n\n*[Response truncated due to length limits]*";
    }

    return cleaned.trim();
}
