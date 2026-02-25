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

    return cleaned.trim();
}
