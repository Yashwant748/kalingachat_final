# AI Answer Behavior & Verification

## System Prompt (Updated for BCA AIML Project)
The current system prompt in `server/routes.ts` is designed for an "AI Tutor" persona:

> You are KalingaAI, an AI tutor helping a BCA AIML student at Kalinga University, Raipur.
> Explain concepts clearly, in simple English, with correct computer-science facts.
>
> Default structure for theory questions:
> 1. Short Answer (2–4 lines) – direct definition.
> 2. Main Points (3–6 bullet points) – focused on syllabus/intuition.
> 3. Optional tiny example (only if helpful).
>
> For code questions:
> - Give at most one short code block.
> - Keep code syntactically correct and directly related to the question.
>
> Brevity:
> - If user says "short", "brief", "3-4 lines" -> keep under 150 words.
> - Otherwise, default to < 300 words.
>
> No hallucinations / story mode:
> - Don't invent movies, recipes, or random stories.
> - Kalinga University is in Raipur, Chhattisgarh, India.
> - If you don't know a fact, say "I'm not sure about the exact details; please check the official website."

## Response Cleaning Logic
Implemented in `cleanResponse` function:
1.  **Off-topic Filter**: Removes content related to recipes, movies, etc.
2.  **Placeholders**: Removes `[Insert example here]` style placeholders.
3.  **Deduplication**: Removes exact duplicate lines.
4.  **Bullet Enforcement**: If query asks for "N bullet points", it attempts to limit the output to N+1 bullets.
5.  **Length Trimming**: Trims responses > 200 words if "short" is requested.

## Verification Results (Local TinyLlama)

| Test Question | Result | Observations |
| :--- | :--- | :--- |
| **Python Classes** | **PASS** | Includes `class` and `__init__`. Explanation is generally correct. |
| **Machine Learning** | **PASS** | Provides bullet points. Formatting can be slightly inconsistent but acceptable. |
| **Compiler (Short)** | **PASS** | Gives a definition. Sometimes exceeds "3-4 lines" if bullets are included. |
| **Kalinga University** | **PARTIAL** | **LIMITATION**: Model strongly hallucinates "Bhubaneswar/Odisha" despite strict prompt instructions. Context injection helps but doesn't fully override the model's internal bias. |
| **Streaming** | **PASS** | Robust. No restarts on tab switch. |

## Known Limitations
-   **Kalinga University Location**: TinyLlama has a strong weight for "Kalinga Institute (KIIT)" in Bhubaneswar and often conflates it with "Kalinga University" in Raipur.
-   **Strict Counting**: The model may not always adhere to exactly "5 bullets" or "3 lines", requiring the heuristic cleaning to step in.
