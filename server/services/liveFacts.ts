import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Live Facts Service (Wikidata P-Codes + Infobox Scraping)
 * Goals:
 * - Direct, precise answers (Name only). NO Paragraphs.
 * - Prioritize Wikidata Structured Data (P169, P6, P35).
 * - Fallback to HTML Infobox scraping if Wikidata fails.
 * - Robust 403 handling with proper headers.
 */

interface LiveFactResult {
  answer: string;
  cached: boolean;
  source: string;
}

interface CacheEntry {
  data: LiveFactResult;
  timestamp: number;
}

const localCache = new Map<string, CacheEntry>();

// CONFIGURATION
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 Minutes
const TIMEOUT_MS = 3000; // 3 Seconds timeout

// User-Agent is CRITICAL for Wikimedia APIs
const AXIOS_CONFIG = {
  headers: {
    'User-Agent': 'KalingaAI/1.0 (mailto:yashwantpan197@gmail.com) BasedOnAxios',
    'Accept': 'application/json',
  },
  timeout: TIMEOUT_MS
};

export const liveFactsService = {

  async getFact(query: string): Promise<LiveFactResult | null> {
    const normalizedKey = query.toLowerCase().trim();

    // 1. Check Cache
    const cached = localCache.get(normalizedKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      console.log(`[LiveFacts] Cache Hit for: "${query}"`);
      return { ...cached.data, cached: true };
    }

    try {
      console.log(`[LiveFacts] Fetching (Fresh): "${query}"`);
      const startTime = Date.now();

      // 2. Parse Query (Role + Entity)
      const parsed = this.parseQuery(query);
      if (!parsed) {
        console.log(`[LiveFacts] Could not parse role/entity from query.`);
        return null;
      }
      console.log(`[LiveFacts] Target: Entity="${parsed.entity}", Role="${parsed.role}"`);

      let params: { name: string; source: string } | null = null;

      // 3. Strategy A: Wikidata (Primary)
      try {
        params = await this.fetchFromWikidata(parsed.entity, parsed.role);
      } catch (wdErr) {
        console.warn(`[LiveFacts] Wikidata failed, trying fallback:`, wdErr);
      }

      // 4. Strategy B: Wikipedia Infobox (Fallback)
      if (!params) {
        console.log(`[LiveFacts] Trying Infobox Fallback...`);
        params = await this.fetchFromInfobox(parsed.entity, parsed.role);
      }

      if (params) {
        // Construct Final Answer
        const finalAnswer = `The ${parsed.displayRole} of ${parsed.displayEntity} is ${params.name}.`;

        const result: LiveFactResult = {
          answer: finalAnswer,
          cached: false,
          source: params.source
        };

        // Save to Cache
        localCache.set(normalizedKey, { data: result, timestamp: Date.now() });

        const duration = Date.now() - startTime;
        console.log(`[LiveFacts] Success (${duration}ms): ${finalAnswer}`);
        return result;
      }

      console.log(`[LiveFacts] No fact found after all strategies.`);
      return null;

    } catch (err: any) {
      console.error(`[LiveFacts] Critical Error: ${err.message}`);
      return null;
    }
  },

  // --- QUERY PARSING ---

  parseQuery(query: string): { role: string; entity: string; displayRole: string; displayEntity: string } | null {
    const q = query.toLowerCase()
      .replace(/[?.,]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // Roles to detect
    const patterns = [
      { key: "ceo", trigger: "ceo", display: "CEO" },
      { key: "cm", trigger: "chief minister", display: "Chief Minister" },
      { key: "cm", trigger: "cm", display: "Chief Minister" },
      { key: "pm", trigger: "prime minister", display: "Prime Minister" },
      { key: "pm", trigger: "pm", display: "Prime Minister" },
      { key: "president", trigger: "president", display: "President" },
      { key: "governor", trigger: "governor", display: "Governor" },
      { key: "founder", trigger: "founder", display: "Founder" },
      { key: "owner", trigger: "owner", display: "Owner" }
    ];

    for (const p of patterns) {
      // "who is ceo of x" or "ceo of x" or "x ceo" (harder)
      // We focus on "Role OF Entity" pattern mostly
      if (q.includes(`${p.trigger} of `)) {
        const entity = q.split(`${p.trigger} of `)[1].trim();
        if (entity) return { role: p.key, entity, displayRole: p.display, displayEntity: this.capitalize(entity) };
      }
      // "who is the [role] [entity]" e.g. "who is the president india" (missing 'of')
      // A bit risky, but let's try direct split if 'of' is missing but 'the' is there?
    }

    // Fallback for lazy users: "ceo openai"
    for (const p of patterns) {
      if (q.includes(p.trigger)) {
        // Remove triggers and common words
        const clean = q.replace(p.trigger, "").replace("who is", "").replace("the", "").replace("current", "").trim();
        if (clean.length > 2) {
          return { role: p.key, entity: clean, displayRole: p.display, displayEntity: this.capitalize(clean) };
        }
      }
    }

    return null;
  },

  capitalize(s: string) {
    return s.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  },

  // --- WIKIDATA STRATEGY ---

  async fetchFromWikidata(entityName: string, role: string): Promise<{ name: string; source: string } | null> {
    // 1. Search for Entity ID (QID)
    const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(entityName)}&language=en&format=json`;
    const searchRes = await axios.get(searchUrl, AXIOS_CONFIG);

    if (!searchRes.data.search || searchRes.data.search.length === 0) return null;

    // Get best match (usually first)
    const entityId = searchRes.data.search[0].id;
    const entityLabel = searchRes.data.search[0].label;
    console.log(`[Wikidata] Found Entity: ${entityId} (${entityLabel})`);

    // 2. Fetch Claims (Properties)
    const claimsUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${entityId}&props=claims&languages=en&format=json`;
    const claimsRes = await axios.get(claimsUrl, AXIOS_CONFIG);
    const claims = claimsRes.data.entities[entityId].claims;

    if (!claims) return null;

    // 3. Map Role to P-Codes
    let propertyIds: string[] = [];
    if (role === "ceo") propertyIds = ["P169"]; // Chief Executive Officer
    if (role === "cm") propertyIds = ["P6", "P1313"]; // Head of Gov, Office Held by
    if (role === "pm") propertyIds = ["P6"]; // Head of Gov
    if (role === "president") propertyIds = ["P35", "P6"]; // Head of State, Head of Gov
    if (role === "governor") propertyIds = ["P6", "P35", "P1308"];
    if (role === "founder") propertyIds = ["P112"];
    if (role === "owner") propertyIds = ["P127"];

    // 4. Extract Value
    for (const pid of propertyIds) {
      if (claims[pid]) {
        const name = await this.extractClaimName(claims[pid]);
        if (name) return { name, source: `Wikidata (${entityLabel})` };
      }
    }

    return null;
  },

  async extractClaimName(claimList: any[]): Promise<string | null> {
    // Sort by rank: preferred > normal. 
    // Filter out "end time" (P582).
    const activeClaims = claimList.filter(c => {
      const qualifiers = c.qualifiers || {};
      return !qualifiers["P582"]; // P582 = End Time. If present, they are former holder.
    });

    if (activeClaims.length === 0) return null;

    // Prefer 'preferred' rank
    const preferred = activeClaims.find(c => c.rank === "preferred");
    const target = preferred || activeClaims[0];

    // The value is usually another Entity (Item)
    if (target.mainsnak.datavalue.type === "wikibase-entityid") {
      const qid = target.mainsnak.datavalue.value.id;
      return await this.resolveLabel(qid);
    }

    return null;
  },

  async resolveLabel(qid: string): Promise<string> {
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=labels&languages=en&format=json`;
    const res = await axios.get(url, AXIOS_CONFIG);
    const labels = res.data.entities[qid].labels;
    return labels.en ? labels.en.value : qid; // Fallback to QID if no English label
  },

  // --- INFOBOX SCRAPING STRATEGY ---

  async fetchFromInfobox(entityName: string, role: string): Promise<{ name: string; source: string } | null> {
    // Try to guess Wikipedia page title. Best guess is the entity name itself.
    // Sometimes for "CM of Chhattisgarh", the page is "Chief Minister of Chhattisgarh".

    let candidateTitles = [entityName];
    if (role === "cm") candidateTitles.unshift(`Chief Minister of ${entityName}`);
    if (role === "pm") candidateTitles.unshift(`Prime Minister of ${entityName}`);
    if (role === "president") candidateTitles.unshift(`President of ${entityName}`);
    if (role === "governor") candidateTitles.unshift(`Governor of ${entityName}`);

    // Try each candidate
    for (const title of candidateTitles) {
      const name = await this.scrapeInfobox(title, role);
      if (name) return { name, source: `Wikipedia Infobox (${title})` };
    }
    return null;
  },

  async scrapeInfobox(title: string, role: string): Promise<string | null> {
    try {
      const url = `https://en.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(title.replace(/ /g, '_'))}`;
      const res = await axios.get(url, AXIOS_CONFIG);
      const $ = cheerio.load(res.data);

      // Find row with specific header
      let foundName: string | null = null;

      $('table.infobox tr').each((i, row) => {
        if (foundName) return;
        const header = $(row).find('th').text().toLowerCase().trim();
        const value = $(row).find('td');

        // Header matching logic
        let match = false;
        if (role === "ceo" && header.includes("ceo")) match = true;
        if (role === "ceo" && header.includes("chief executive")) match = true;
        if (role === "cm" && (header.includes("incumbent") || header.includes("chief minister"))) match = true;
        if ((role === "pm" || role === "president" || role === "governor") && (header.includes("incumbent") || header.includes(role))) match = true;
        if (role === "founder" && header.includes("founder")) match = true;
        if (role === "owner" && header.includes("owner")) match = true;

        if (match) {
          // Extract text. Clean footnotes [1] etc.
          const cleanText = value.text().replace(/\[.*?\]/g, "").trim();
          // Usually take the first line or first link
          const firstLink = value.find('a').first().text();
          // If the text is long, prefer the first link or split by newline
          foundName = firstLink || cleanText.split('\n')[0];
        }
      });

      return foundName;
    } catch (e) {
      return null;
    }
  }
};