import { Project, Document } from '../types';

const DB_NAME = 'ai_copyright_db';
const DB_VERSION = 2;

class DatabaseService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;

        if (oldVersion < 1) {
          // Initial schema
          const projectStore = db.createObjectStore('projects', {
            keyPath: 'id'
          });
          projectStore.createIndex('status', 'status', { unique: false });
          projectStore.createIndex('createdAt', 'createdAt', { unique: false });

          const docStore = db.createObjectStore('documents', { keyPath: 'id' });
          docStore.createIndex('projectId', 'projectId', { unique: false });
          docStore.createIndex('type', 'type', { unique: false });
          docStore.createIndex('status', 'status', { unique: false });
          docStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        if (oldVersion >= 1 && oldVersion < 2) {
          // Upgrade from v1 to v2: add missing indexes
          const transaction = (event.target as IDBOpenDBRequest).transaction!;

          const projectStore = transaction.objectStore('projects');
          if (!projectStore.indexNames.contains('status')) {
            projectStore.createIndex('status', 'status', { unique: false });
          }
          if (!projectStore.indexNames.contains('createdAt')) {
            projectStore.createIndex('createdAt', 'createdAt', {
              unique: false
            });
          }

          const docStore = transaction.objectStore('documents');
          if (!docStore.indexNames.contains('type')) {
            docStore.createIndex('type', 'type', { unique: false });
          }
          if (!docStore.indexNames.contains('status')) {
            docStore.createIndex('status', 'status', { unique: false });
          }
          if (!docStore.indexNames.contains('updatedAt')) {
            docStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          }
        }
      };
    });
  }

  async getProjects(): Promise<Project[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['projects'], 'readonly');
      const store = transaction.objectStore('projects');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveProject(project: Project): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['projects'], 'readwrite');
      const store = transaction.objectStore('projects');
      const request = store.put(project);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteProject(id: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        ['projects', 'documents'],
        'readwrite'
      );

      const projectStore = transaction.objectStore('projects');
      projectStore.delete(id);

      const docStore = transaction.objectStore('documents');
      const index = docStore.index('projectId');
      const request = index.getAllKeys(id);

      request.onsuccess = () => {
        request.result.forEach((docId) => {
          docStore.delete(docId);
        });
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getDocuments(): Promise<Document[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['documents'], 'readonly');
      const store = transaction.objectStore('documents');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveDocument(document: Document): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['documents'], 'readwrite');
      const store = transaction.objectStore('documents');
      const request = store.put(document);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const dbService = new DatabaseService();