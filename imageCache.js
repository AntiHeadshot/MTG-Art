import { openDB, deleteDB, wrap, unwrap } from 'https://cdn.jsdelivr.net/npm/idb@8/+esm';

// Open (or create) the database
const db = await openDB('imageCacheDB', 1, {
    upgrade(db, oldVersion, newVersion, transaction, event) {
        if (oldVersion < 1) {
            const objectStore = db.createObjectStore('images', { keyPath: 'uri' });
            objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
    }
});

class ImageCache {
    static async storeImage(uri, blob) {
        const objectStore = db.transaction('images', 'readwrite').objectStore('images');

        const data = {
            uri: uri,
            blob: blob,
            timestamp: new Date().toISOString()
        };

        await objectStore.add(data);
    }

    static async getImage(uri) {
        const objectStore = db.transaction('images', 'readonly').objectStore('images');
        try {
            return (await objectStore.get(uri)).blob;
        } catch (_) {
            return null;
        }
    }

    static async deleteOldImages(ageInDays) {
        const objectStore = db.transaction('images', 'readwrite').objectStore('images');
        let cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - ageInDays);
  
        let cursor = await objectStore.index('timestamp').openCursor();
        while (cursor) {
            console.log(cursor.key);
            const imageDate = new Date(cursor.value.timestamp);
            if (imageDate < cutoffDate) {
                await objectStore.delete(cursor.primaryKey);
            }
            cursor = await cursor.continue();
        }
    }
}

export { ImageCache };
export default ImageCache;