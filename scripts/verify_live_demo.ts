
import { liveFactsService } from "./server/services/liveFacts";

async function runDemo() {
    console.log("=== KalingaAI LiveFacts Logic Demo ===");

    // Test 1: CEO of OpenAI (Wikidata P169)
    console.log("\n1. Testing 'who is ceo of openai'...");
    const start1 = Date.now();
    const res1 = await liveFactsService.getFact("who is ceo of openai");
    const time1 = Date.now() - start1;
    console.log(`   Result: ${JSON.stringify(res1)}`);
    console.log(`   TimeDesc: ${time1}ms`);

    // Test 2: CM of Chhattisgarh (Wikidata P6/P1313 or Infobox)
    console.log("\n2. Testing 'who is cm of chhattisgarh'...");
    const start2 = Date.now();
    const res2 = await liveFactsService.getFact("who is cm of chhattisgarh");
    const time2 = Date.now() - start2;
    console.log(`   Result: ${JSON.stringify(res2)}`);
    console.log(`   TimeDesc: ${time2}ms`);

    // Test 3: Invalid Query
    console.log("\n3. Testing 'who is king of mars' (Should be null)...");
    const res3 = await liveFactsService.getFact("who is king of mars");
    console.log(`   Result: ${res3}`); // Should be null

    console.log("\n=== Demo Complete ===");
}

runDemo().catch(console.error);
