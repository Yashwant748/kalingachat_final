
type CacheEntry<T> = {
    value: T;
    expiry: number;
};

export class SimpleCache {
    private cache: Map<string, CacheEntry<any>> = new Map();
    private defaultTTL: number;

    constructor(defaultTTLSeconds: number = 3600) { // Default 1 hour
        this.defaultTTL = defaultTTLSeconds * 1000;
    }

    set<T>(key: string, value: T, ttlSeconds?: number): void {
        const ttl = ttlSeconds ? ttlSeconds * 1000 : this.defaultTTL;
        this.cache.set(key, {
            value,
            expiry: Date.now() + ttl
        });
    }

    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return null;
        }

        return entry.value;
    }

    clear(): void {
        this.cache.clear();
    }
}

export const liveFactCache = new SimpleCache(3600); // 1 Hour global cache for facts
