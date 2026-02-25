
import _wikipedia from 'wikipedia';
// Handle CommonJS/ESM interop
const wikipedia = (_wikipedia as any).default || _wikipedia;

async function verifyWikipedia() {
    console.log("=== Testing Wikipedia API (Fetch) ===");
    const query = "President of India";

    try {
        // 1. Search
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json`;
        console.log(`Fetching: ${searchUrl}`);

        const searchRes = await fetch(searchUrl, {
            headers: { 'User-Agent': 'KalingaAI-StudentProject/1.0 (kalingachat@example.com)' }
        });

        if (!searchRes.ok) throw new Error(`Search failed: ${searchRes.status}`);
        const searchData = await searchRes.json();

        if (searchData.query.search.length > 0) {
            const bestTitle = searchData.query.search[0].title;
            console.log(`Top Result: ${bestTitle}`);

            // 2. Get Summary
            const summaryUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(bestTitle)}&format=json`;
            const summaryRes = await fetch(summaryUrl, {
                headers: { 'User-Agent': 'KalingaAI-StudentProject/1.0 (kalingachat@example.com)' }
            });
            const summaryData = await summaryRes.json();
            const pages = summaryData.query.pages;
            const pageId = Object.keys(pages)[0];
            const extract = pages[pageId].extract;

            console.log(`Summary Preview: ${extract.substring(0, 100)}...`);
            console.log("SUCCESS: Wikipedia Fetch works.");
        } else {
            console.error("FAILURE: No results found.");
        }

    } catch (error) {
        console.error("FAILURE: API Error", error);
    }
}

verifyWikipedia();
