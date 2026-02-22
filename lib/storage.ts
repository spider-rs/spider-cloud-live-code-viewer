const DB_NAME = "spider-archiver";
const DB_VERSION = 1;
const PAGES_STORE = "pages";
const MAX_STORAGE_BYTES = 50 * 1024 * 1024; // 50MB

export interface StoredPage {
  url: string;
  content: string;
  error?: string;
  status?: number;
  domain: string;
  timestamp: number;
  contentSize: number;
}

export interface DomainInfo {
  domain: string;
  pageCount: number;
  totalSize: number;
  lastCrawled: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PAGES_STORE)) {
        const store = db.createObjectStore(PAGES_STORE, { keyPath: "url" });
        store.createIndex("domain", "domain", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getDomain(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
  } catch {
    return url.split("/")[0];
  }
}

export async function savePages(
  pages: { url: string; content?: string; error?: string; status?: number }[]
): Promise<void> {
  if (!pages?.length) return;

  await evictIfNeeded(pages);

  const db = await openDB();
  const now = Date.now();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(PAGES_STORE, "readwrite");
    const store = tx.objectStore(PAGES_STORE);

    for (const page of pages) {
      if (!page?.url) continue;
      const content = page.content || "";
      store.put({
        url: page.url,
        content,
        error: page.error,
        status: page.status,
        domain: getDomain(page.url),
        timestamp: now,
        contentSize: new Blob([content]).size,
      } satisfies StoredPage);
    }

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getPagesByDomain(domain: string): Promise<StoredPage[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(PAGES_STORE, "readonly");
    const index = tx.objectStore(PAGES_STORE).index("domain");
    const request = index.getAll(domain);

    request.onsuccess = () => {
      db.close();
      resolve(request.result);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function searchPages(query: string): Promise<StoredPage[]> {
  const db = await openDB();
  const lowerQuery = query.toLowerCase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(PAGES_STORE, "readonly");
    const request = tx.objectStore(PAGES_STORE).getAll();

    request.onsuccess = () => {
      db.close();
      resolve(
        (request.result as StoredPage[]).filter((page) =>
          page.url.toLowerCase().includes(lowerQuery)
        )
      );
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function getSavedDomains(): Promise<DomainInfo[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(PAGES_STORE, "readonly");
    const request = tx.objectStore(PAGES_STORE).getAll();

    request.onsuccess = () => {
      db.close();
      const pages = request.result as StoredPage[];
      const domainMap = new Map<string, DomainInfo>();

      for (const page of pages) {
        const info = domainMap.get(page.domain) || {
          domain: page.domain,
          pageCount: 0,
          totalSize: 0,
          lastCrawled: 0,
        };
        info.pageCount++;
        info.totalSize += page.contentSize;
        info.lastCrawled = Math.max(info.lastCrawled, page.timestamp);
        domainMap.set(page.domain, info);
      }

      resolve(
        Array.from(domainMap.values()).sort(
          (a, b) => b.lastCrawled - a.lastCrawled
        )
      );
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function clearDomain(domain: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(PAGES_STORE, "readwrite");
    const store = tx.objectStore(PAGES_STORE);
    const index = store.index("domain");
    const request = index.openCursor(domain);

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function clearAll(): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(PAGES_STORE, "readwrite");
    tx.objectStore(PAGES_STORE).clear();
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function evictIfNeeded(
  newPages: { content?: string }[]
): Promise<void> {
  const domains = await getSavedDomains();
  const currentSize = domains.reduce((sum, d) => sum + d.totalSize, 0);
  const newSize = newPages.reduce(
    (sum, p) => sum + new Blob([p.content || ""]).size,
    0
  );

  if (currentSize + newSize <= MAX_STORAGE_BYTES) return;

  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(PAGES_STORE, "readwrite");
    const store = tx.objectStore(PAGES_STORE);
    const index = store.index("timestamp");
    const request = index.openCursor();

    let freed = 0;
    const needed = currentSize + newSize - MAX_STORAGE_BYTES;

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor && freed < needed) {
        freed += (cursor.value as StoredPage).contentSize;
        cursor.delete();
        cursor.continue();
      }
    };

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
