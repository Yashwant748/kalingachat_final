
import axios from 'axios';

const AXIOS_CONFIG = {
    headers: {
        'User-Agent': 'KalingaAI/1.0 (mailto:yashwantpan197@gmail.com) BasedOnAxios',
        'Accept': 'application/json',
    },
    timeout: 5000
};

async function debug() {
    console.log("=== DEBUG FULL ===");
    try {
        const searchUrl = `https://www.wikidata.org/w/api.php?action=wbwbsearch&search=openai&language=en&format=json`;
        console.log(`GET ${searchUrl}`);
        const res = await axios.get(searchUrl, AXIOS_CONFIG);
        console.log("Status:", res.status);
        console.log("Headers:", JSON.stringify(res.headers, null, 2));
        console.log("BODY SAMPLE:", JSON.stringify(res.data, null, 2).slice(0, 1000));

        if (res.data.error) {
            console.error("API ERROR:", res.data.error);
        }
    } catch (e: any) {
        console.error("AXIOS ERROR:", e.message);
        if (e.response) {
            console.log("Response Status:", e.response.status);
            console.log("Response Data:", JSON.stringify(e.response.data, null, 2));
        }
    }
}

debug();
