
import axios from 'axios';

const AXIOS_CONFIG = {
    headers: {
        'User-Agent': 'KalingaAI/1.0 (mailto:yashwantpan197@gmail.com) BasedOnAxios',
        'Accept': 'application/json',
    },
    timeout: 5000
};

async function debug() {
    console.log("=== DEBUG WIKIDATA ===");
    try {
        // 1. Search OpenAI
        console.log("\n--- Searching 'openai' ---");
        const searchUrl = `https://www.wikidata.org/w/api.php?action=wbwbsearch&search=openai&language=en&format=json`;
        const searchRes = await axios.get(searchUrl, AXIOS_CONFIG);
        console.log("Search Status:", searchRes.status);
        console.log("Search Result 0:", JSON.stringify(searchRes.data.search?.[0], null, 2));

        if (searchRes.data.search?.[0]) {
            const qid = searchRes.data.search[0].id;
            console.log(`\n--- Fetching Claims for ${qid} ---`);
            const claimsUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=claims&languages=en&format=json`;
            const claimsRes = await axios.get(claimsUrl, AXIOS_CONFIG);
            const claims = claimsRes.data.entities[qid].claims;

            const p169 = claims['P169'];
            console.log("P169 (CEO) Claims Count:", p169?.length);
            if (p169) {
                p169.forEach((c: any, i: number) => {
                    console.log(`Claim ${i}: Rank=${c.rank}, EndTime=${JSON.stringify(c.qualifiers?.P582)}`);
                    console.log(`Value:`, JSON.stringify(c.mainsnak.datavalue));
                });
            }
        }

        // 2. Search Chhattisgarh
        console.log("\n--- Searching 'chhattisgarh' ---");
        const s2 = await axios.get(`https://www.wikidata.org/w/api.php?action=wbwbsearch&search=chhattisgarh&language=en&format=json`, AXIOS_CONFIG);
        const qid2 = s2.data.search?.[0]?.id;
        console.log("QID2:", qid2);

        if (qid2) {
            const c2Res = await axios.get(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid2}&props=claims&languages=en&format=json`, AXIOS_CONFIG);
            const claims2 = c2Res.data.entities[qid2].claims;
            // CM checks: P6, P1313
            console.log("P6 (Head of Gov):", claims2['P6']?.length);
            console.log("P1313 (Office Held):", claims2['P1313']?.length);
        }

    } catch (e: any) {
        console.error("AXIOS ERROR:", e.message);
        if (e.response) console.error("Data:", e.response.data);
    }
}

debug();
