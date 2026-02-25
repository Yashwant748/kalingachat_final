
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParseModule = require('pdf-parse');
// Handle both CommonJS and potential ESM default export weirdness
const pdfParse = pdfParseModule.default || pdfParseModule;

// --- Types ---
export interface DocumentChunk {
  id: string;
  text: string;
  embedding: number[];
  source: string;
  // Metadata
  uploadedAt: number;
  mimeType: string;
}

export interface SearchResult {
  chunk: DocumentChunk;
  similarity: number;
}

// --- Constants ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_FILE = path.join(__dirname, 'rag_store.json');
const OLLAMA_API_URL = 'http://127.0.0.1:11434';
const EMBEDDING_MODEL = 'nomic-embed-text';

export class RAGService {
  private chunks: DocumentChunk[] = [];

  constructor() {
    this.loadStorage();
  }

  // Load vectors from disk
  private loadStorage() {
    if (fs.existsSync(STORAGE_FILE)) {
      try {
        const data = fs.readFileSync(STORAGE_FILE, 'utf-8');
        this.chunks = JSON.parse(data);
        console.log(`[RAG] Loaded ${this.chunks.length} chunks from storage.`);
      } catch (err) {
        console.error('[RAG] Error loading storage:', err);
        this.chunks = [];
      }
    }
  }

  // Save vectors to disk
  private saveStorage() {
    try {
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(this.chunks, null, 2));
    } catch (err) {
      console.error('[RAG] Error saving storage:', err);
    }
  }

  // Call Ollama to get embeddings
  private async getEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${OLLAMA_API_URL}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.embedding;
    } catch (err) {
      console.error('[RAG] Embedding generation failed:', err);
      throw err;
    }
  }

  // Cosine similarity
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Add document (PDF/TXT)
  async addDocument(buffer: Buffer, filename: string, mimeType: string) {
    let text = '';

    console.log(`[RAG] Processing ${filename} (${mimeType})...`);
    console.log(`[RAG] Buffer header: ${buffer.slice(0, 100).toString()}`);

    if (mimeType === 'application/pdf') {
      try {
        // pdf-parse is a CommonJS module, so we use the required instance
        const data = await pdfParse(new Uint8Array(buffer));
        text = data.text;
      } catch (pdfError) {
        console.error('[RAG] PDF parsing failed:', pdfError);
        throw new Error('Failed to parse PDF file.');
      }
    } else if (mimeType === 'text/plain') {
      text = buffer.toString('utf-8');
    } else {
      throw new Error('Unsupported file type. Use PDF or TXT.');
    }

    // Clean text: remove repeating newlines, etc.
    text = text.replace(/\n\s*\n/g, '\n').trim();

    if (!text) {
      throw new Error('Document appears to be empty.');
    }

    // Chunking strategy
    const CHUNK_SIZE = 500;
    const OVERLAP = 50;
    const newChunks: DocumentChunk[] = [];

    for (let i = 0; i < text.length; i += (CHUNK_SIZE - OVERLAP)) {
      const slice = text.substring(i, i + CHUNK_SIZE);
      if (slice.length < 50) continue; // Skip very small chunks

      // Get embedding
      const embedding = await this.getEmbedding(slice);

      newChunks.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: slice,
        embedding: embedding,
        source: filename,
        // Metadata
        uploadedAt: Date.now(),
        mimeType: mimeType,
      });
    }

    this.chunks.push(...newChunks);
    this.saveStorage();
    console.log(`[RAG] Added ${newChunks.length} chunks from ${filename}`);
    return newChunks.length;
  }

  // Search query
  async search(query: string, limit: number = 3): Promise<SearchResult[]> {
    if (this.chunks.length === 0) return [];

    const queryEmbedding = await this.getEmbedding(query);

    const results = this.chunks.map(chunk => ({
      chunk,
      similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    // Sort by similarity descending
    results.sort((a, b) => b.similarity - a.similarity);

    // Filter by threshold (Strictness)
    const threshold = 0.4;
    const filtered = results.filter(r => r.similarity >= threshold);

    // Return top N
    return filtered.slice(0, limit);
  }
  // Clear all data
  clear() {
    this.chunks = [];
    this.saveStorage();
    console.log('[RAG] Cleared all chunks.');
  }
}

export const ragService = new RAGService();