/**
 * Mock Redis Client for Testing
 */

class MockRedis {
  constructor() {
    this.store = new Map();
    this.connected = true;
  }
  
  async get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    
    // Check expiry
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  async set(key, value, options = {}) {
    const item = { value };
    
    if (options.EX) {
      item.expiresAt = Date.now() + (options.EX * 1000);
    }
    if (options.PX) {
      item.expiresAt = Date.now() + options.PX;
    }
    
    this.store.set(key, item);
    return 'OK';
  }
  
  async setex(key, seconds, value) {
    return this.set(key, value, { EX: seconds });
  }
  
  async del(...keys) {
    let deleted = 0;
    for (const key of keys) {
      if (this.store.delete(key)) {
        deleted++;
      }
    }
    return deleted;
  }
  
  async exists(...keys) {
    let count = 0;
    for (const key of keys) {
      if (this.store.has(key)) {
        count++;
      }
    }
    return count;
  }
  
  async incr(key) {
    const current = await this.get(key);
    const newValue = (parseInt(current) || 0) + 1;
    await this.set(key, newValue.toString());
    return newValue;
  }
  
  async expire(key, seconds) {
    const item = this.store.get(key);
    if (!item) return 0;
    
    item.expiresAt = Date.now() + (seconds * 1000);
    return 1;
  }
  
  async ttl(key) {
    const item = this.store.get(key);
    if (!item) return -2;
    if (!item.expiresAt) return -1;
    
    const remaining = Math.ceil((item.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }
  
  async keys(pattern) {
    const regex = new RegExp(pattern.replace('*', '.*'));
    const keys = [];
    
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        keys.push(key);
      }
    }
    
    return keys;
  }
  
  async flushall() {
    this.store.clear();
    return 'OK';
  }
  
  async quit() {
    this.connected = false;
    return 'OK';
  }
  
  async ping() {
    return 'PONG';
  }
  
  // Clear for testing
  clear() {
    this.store.clear();
  }
}

module.exports = MockRedis;
