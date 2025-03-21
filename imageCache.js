import { openDB, deleteDB, wrap, unwrap } from 'https://cdn.jsdelivr.net/npm/idb@8/+esm';

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
            console.log(entry);
            entry.session = session;
            console.log("deleting");
            await objectStore.delete(uri);
            console.log("adding");
            await objectStore.put(entry);
            console.log("returning");
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
}

export { ImageCache };
export default ImageCache;