/**
 * Wraps the user's message in strict system-like instructions to enforce language output
 * directly within the prompt itself, heavily improving offline model adherence (like TinyLLaMA).
 * 
 * @param userMessage Original user input
 * @param language The language to enforce
 * @returns Clean prompt enforcing language constraints
 */
export function buildMultilingualPrompt(userMessage: string, language: string): string {
    // Return original message. Let the SYSTEM prompt handle language enforcement
    // so the AI does not get confused by third-person "User asks:" wrappers.
    return userMessage;
}
