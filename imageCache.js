import { openDB, deleteDB } from 'https://cdn.jsdelivr.net/npm/idb@8/+esm';
import isMobileBrowser from './browserdetection.js';

let isMobile = isMobileBrowser(navigator.userAgent || navigator.vendor || window.opera);

let imageCache;

if (isMobile) {
    await deleteDB("imageCacheDB");

    let cache = {};

    class ImageCache {
        static async storeImage(uri, blob, session) {
            session ||= 0;

            const data = {
                uri,
                blob,
                session,
                timestamp: new Date().toISOString()
            };

            cache[uri] = data;
        }

        static async getImage(uri, session) {
            session ||= 0;
            try {
                let entry = cache[uri];

                if(entry == null)
                    return null;

                entry.session = session;
                entry.timestamp = new Date().toISOString();

                return entry.blob;
            } catch (_) {
                return null;
            }
        }

        static async deleteOldImages(ageInDays) {
            let cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - ageInDays);

            for (let uri in cache) {
                if (new Date(cache[uri].timestamp) < cutoffDate) {
                    delete cache[uri];
                }
            }
        }

        static async clearOldSessions(session) {
        }

        static async getObjectStoreSize(session) {
            return session ? { totalSize: 0, sessionSize: 0 } : 0;
        }
    }
    imageCache = ImageCache;
} else {
    // Open (or create) the database
    const db = await openDB('imageCacheDB', 2, {
        upgrade(db, oldVersion, newVersion, transaction, event) {
            if (oldVersion < 1) {
                const objectStore = db.createObjectStore('images', { keyPath: 'uri' });
                objectStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
            if (oldVersion < 2) {
                const objectStore = transaction.objectStore('images');
                objectStore.createIndex("session", "session", { unique: false });
            }
        }
    });

    class ImageCache {
        static async storeImage(uri, blob, session) {
            session ||= 0;
            const objectStore = db.transaction('images', 'readwrite').objectStore('images');

            const data = {
                uri,
                blob,
                session,
                timestamp: new Date().toISOString()
            };

            await objectStore.add(data);
        }

        static async getImage(uri, session) {
            session ||= 0;
            const objectStore = db.transaction('images', 'readwrite').objectStore('images');
            try {
                let entry = await objectStore.get(uri);
                entry.session = session;
                entry.timestamp = new Date().toISOString();

                await objectStore.delete(uri);
                await objectStore.put(entry);
                return entry.blob;
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
                const imageDate = new Date(cursor.value.timestamp);
                if (imageDate < cutoffDate)
                    await objectStore.delete(cursor.primaryKey);
                cursor = await cursor.continue();
            }
        }

        static async clearOldSessions(session) {
            const objectStore = db.transaction('images', 'readwrite').objectStore('images');

            let cursor = await objectStore.index('session').openCursor();
            while (cursor) {
                if (cursor.value.session < session)
                    await objectStore.delete(cursor.primaryKey);
                cursor = await cursor.continue();
            }
        }

        static async getObjectStoreSize(session) {
            const objectStore = db.transaction('images', 'readonly').objectStore('images');
            let totalSize = 0;
            let sessionSize = 0;

            let cursor = await objectStore.openCursor();
            while (cursor) {
                totalSize += cursor.value.blob.length;
                if (cursor.value.session == session)
                    sessionSize += cursor.value.blob.length;
                cursor = await cursor.continue();
            }

            return session ? { totalSize, sessionSize } : totalSize;
        }
    }

    imageCache = ImageCache;
}

export { imageCache };
export default imageCache;