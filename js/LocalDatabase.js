/**
 * LocalDatabase.js
 * An offline-first Realtime Database adapter mirroring Firebase Realtime Database (RTDB) API:
 *   - database.ref(path)
 *   - ref.on('value', callback)
 *   - ref.once('value') -> Promise<DataSnapshot>
 *   - ref.set(data) -> Promise
 *   - ref.update(data) -> Promise
 *   - ref.remove() -> Promise
 *   - ref.off('value', callback)
 *
 * Synchronizes across multiple browser tabs in real-time via BroadcastChannel and localStorage.
 */

(function () {
  const STORAGE_KEY = 'FRUIT_CATCHER_DB_STATE';
  const CHANNEL_NAME = 'FRUIT_CATCHER_BROADCAST_CHANNEL';

  function defaultState() {
    return {
      gameState: 0,
      playerCount: 0,
      players: {}
    };
  }

  function clone(obj) {
    if (obj === undefined) return undefined;
    return JSON.parse(JSON.stringify(obj));
  }

  function normalizePath(path) {
    if (!path || path === '/') return [];
    return path
      .split('/')
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }

  function getByPath(obj, segments) {
    let curr = obj;
    for (let seg of segments) {
      if (curr === null || curr === undefined || typeof curr !== 'object') {
        return undefined;
      }
      curr = curr[seg];
    }
    return curr;
  }

  function setByPath(obj, segments, value) {
    if (segments.length === 0) {
      return value || {};
    }
    let curr = obj;
    for (let i = 0; i < segments.length - 1; i++) {
      let seg = segments[i];
      if (!curr[seg] || typeof curr[seg] !== 'object') {
        curr[seg] = {};
      }
      curr = curr[seg];
    }
    const lastKey = segments[segments.length - 1];
    if (value === null || value === undefined) {
      delete curr[lastKey];
    } else {
      curr[lastKey] = clone(value);
    }
    return obj;
  }

  class DataSnapshot {
    constructor(key, value) {
      this._key = key;
      this._val = clone(value);
    }

    get key() {
      return this._key;
    }

    val() {
      return clone(this._val);
    }

    exists() {
      return this._val !== undefined && this._val !== null;
    }
  }

  class LocalRef {
    constructor(db, path) {
      this.db = db;
      this.path = path || '/';
      this.segments = normalizePath(path);
      this.key = this.segments.length > 0 ? this.segments[this.segments.length - 1] : null;
    }

    on(eventType, callback) {
      if (eventType !== 'value') return;
      this.db._addListener(this.segments, callback);
      // Firebase triggers 'value' immediately with current snapshot
      const currentVal = getByPath(this.db.data, this.segments);
      setTimeout(() => {
        callback(new DataSnapshot(this.key, currentVal));
      }, 0);
      return callback;
    }

    off(eventType, callback) {
      if (eventType !== 'value') return;
      this.db._removeListener(this.segments, callback);
    }

    once(eventType) {
      if (eventType !== 'value') return Promise.resolve(new DataSnapshot(this.key, null));
      const currentVal = getByPath(this.db.data, this.segments);
      return Promise.resolve(new DataSnapshot(this.key, currentVal));
    }

    set(val) {
      this.db._setValue(this.segments, val);
      return Promise.resolve();
    }

    update(values) {
      this.db._updateValue(this.segments, values);
      return Promise.resolve();
    }

    remove() {
      return this.set(null);
    }
  }

  function pathsIntersect(segmentsA, segmentsB) {
    if (!segmentsA || !segmentsB) return true;
    if (segmentsA.length === 0 || segmentsB.length === 0) return true;
    const minLen = Math.min(segmentsA.length, segmentsB.length);
    for (let i = 0; i < minLen; i++) {
      if (segmentsA[i] !== segmentsB[i]) return false;
    }
    return true;
  }

  class LocalDatabase {
    constructor() {
      this.listeners = [];
      this.data = defaultState();
      this.loadFromStorage();

      // BroadcastChannel for cross-tab synchronization
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          this.channel = new BroadcastChannel(CHANNEL_NAME);
          const handleMsg = (event) => {
            if (event.data && event.data.type === 'SYNC_STATE') {
              this.data = event.data.state;
              this._notifyAll(event.data.changedSegments || []);
            }
          };
          this.channel.addEventListener('message', handleMsg);
          this.channel.onmessage = handleMsg;
        } catch (e) {
          console.warn('BroadcastChannel not supported or error:', e);
        }
      }

      // localStorage storage event listener fallback for cross-tab sync
      if (typeof window !== 'undefined') {
        window.addEventListener('storage', (event) => {
          if (event.key === STORAGE_KEY && event.newValue) {
            try {
              this.data = JSON.parse(event.newValue);
              this._notifyAll([]);
            } catch (e) {}
          }
        });

        // Periodic sync fallback in case tab doesn't receive broadcast event
        setInterval(() => {
          this.checkStorageSync();
        }, 100);
      }
    }

    checkStorageSync() {
      if (typeof window === 'undefined' || !window.localStorage) return;
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored && stored !== this._lastStoredString) {
          this._lastStoredString = stored;
          const parsed = JSON.parse(stored);
          if (JSON.stringify(parsed) !== JSON.stringify(this.data)) {
            this.data = parsed;
            this._notifyAll([]);
          }
        }
      } catch (e) {}
    }

    loadFromStorage() {
      if (typeof window === 'undefined' || !window.localStorage) return;
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          this._lastStoredString = stored;
          this.data = Object.assign(defaultState(), JSON.parse(stored));
        } else {
          this.saveToStorage();
        }
      } catch (e) {
        console.warn('Could not read from localStorage:', e);
      }
    }

    saveToStorage() {
      if (typeof window === 'undefined' || !window.localStorage) return;
      try {
        const str = JSON.stringify(this.data);
        this._lastStoredString = str;
        window.localStorage.setItem(STORAGE_KEY, str);
      } catch (e) {
        console.warn('Could not save to localStorage:', e);
      }
    }

    broadcast(changedSegments) {
      this.saveToStorage();
      if (this.channel) {
        try {
          this.channel.postMessage({
            type: 'SYNC_STATE',
            state: this.data,
            changedSegments: changedSegments || [],
            timestamp: Date.now()
          });
        } catch (e) {}
      }
    }

    ref(path) {
      return new LocalRef(this, path);
    }

    _setValue(segments, value) {
      if (segments.length === 0) {
        this.data = typeof value === 'object' && value !== null ? value : defaultState();
      } else {
        setByPath(this.data, segments, value);
      }
      this.broadcast(segments);
      this._notifyAll(segments);
    }

    _updateValue(segments, values) {
      if (typeof values !== 'object' || values === null) return;
      let target = this.data;
      if (segments.length > 0) {
        for (let seg of segments) {
          if (!target[seg] || typeof target[seg] !== 'object') {
            target[seg] = {};
          }
          target = target[seg];
        }
      }
      for (let key in values) {
        if (key.startsWith('/')) {
          const subSegments = normalizePath(key);
          setByPath(this.data, subSegments, values[key]);
        } else {
          target[key] = clone(values[key]);
        }
      }
      this.broadcast(segments);
      this._notifyAll(segments);
    }

    _addListener(segments, callback) {
      this.listeners.push({ segments, callback });
    }

    _removeListener(segments, callback) {
      const pathStr = segments.join('/');
      this.listeners = this.listeners.filter(
        l => !(l.segments.join('/') === pathStr && l.callback === callback)
      );
    }

    _notifyAll(changedSegments) {
      for (let item of this.listeners) {
        if (changedSegments && !pathsIntersect(changedSegments, item.segments)) {
          continue;
        }
        try {
          const val = getByPath(this.data, item.segments);
          const key = item.segments.length > 0 ? item.segments[item.segments.length - 1] : null;
          item.callback(new DataSnapshot(key, val));
        } catch (err) {
          console.error('Error in database listener:', err);
        }
      }
    }

    reset() {
      this.data = defaultState();
      this.broadcast([]);
      this._notifyAll([]);
      console.log('Database reset to default state');
    }
  }

  // Create singleton instance
  const localDbInstance = new LocalDatabase();
  window.localDatabaseInstance = localDbInstance;
  window.LocalDatabase = LocalDatabase;

  // Seamlessly wire into firebase.database()
  window.firebase = window.firebase || {};
  window.firebase.initializeApp = window.firebase.initializeApp || function () { return {}; };
  window.firebase.database = function () {
    return localDbInstance;
  };

  // Expose global helper to easily reset from console or button
  window.resetGameDatabase = function () {
    localDbInstance.reset();
  };
})();
