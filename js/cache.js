class CacheManager {
  constructor() {
    this.memoryCache = {};
    this.databaseCache = {};
  }

  // Memory caching methods
  set(key, value) {
    this.memoryCache[key] = value;
  }

  get(key) {
    return this.memoryCache[key];
  }

  delete(key) {
    delete this.memoryCache[key];
  }

  clear() {
    this.memoryCache = {};
  }

  // Database caching methods
  setDB(key, value) {
    this.databaseCache[key] = value;
  }

  getDB(key) {
    return this.databaseCache[key];
  }

  // Fetch data with cache mechanism
  getOrFetch(key, fetchFunction) {
    if (this.memoryCache[key]) {
      return this.memoryCache[key];
    }
    const data = fetchFunction();
    this.set(key, data);
    return data;
  }

  // Invalidate cache entry
  invalidate(key) {
    this.delete(key);
  }

  // Get cache statistics
  getStats() {
    return {
      memoryCacheSize: Object.keys(this.memoryCache).length,
      databaseCacheSize: Object.keys(this.databaseCache).length
    };
  }
}