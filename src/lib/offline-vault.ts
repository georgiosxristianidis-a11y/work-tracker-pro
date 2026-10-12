/**
 * Offline storage and encryption vault using Web Crypto API (AES-GCM-256 + PBKDF2).
 * Operates strictly locally within IndexedDB with zero network exfiltration.
 */

const DB_NAME = 'finance_offline_vault_db';
const DB_VERSION = 1;
const STORE_NAME = 'secure_entries';

interface EncryptedPayload {
  iv: string; // Base64 12 bytes
  salt: string; // Base64 16 bytes
  ciphertext: string; // Base64
  updatedAt: number;
}

let activeSessionKey: CryptoKey | null = null;
let activeSessionPassphrase = '';

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function openVaultDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class OfflineVault {
  /**
   * Retrieves or derives an in-memory CryptoKey.
   * Caches the key during active session to eliminate 100,000 PBKDF2 iterations on every save.
   */
  static async getSessionKey(passphrase?: string, salt?: Uint8Array): Promise<CryptoKey> {
    if (activeSessionKey && (!passphrase || passphrase === activeSessionPassphrase)) {
      return activeSessionKey;
    }

    if (passphrase) {
      const actualSalt = salt || crypto.getRandomValues(new Uint8Array(16));
      const key = await this.deriveKey(passphrase, actualSalt);
      activeSessionKey = key;
      activeSessionPassphrase = passphrase;
      return key;
    }

    // Generate isolated ephemeral AES-GCM session key
    const generated = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    activeSessionKey = generated;
    return generated;
  }

  /**
   * Derives an AES-GCM CryptoKey using PBKDF2 from a passphrase and salt.
   */
  static async deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypts a JavaScript object into a Base64-encoded envelope.
   */
  static async encrypt(data: unknown, passphrase?: string): Promise<EncryptedPayload> {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const key = await this.getSessionKey(passphrase, salt);
    const plaintext = encoder.encode(JSON.stringify(data));

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      plaintext
    );

    return {
      iv: bufferToBase64(iv),
      salt: bufferToBase64(salt),
      ciphertext: bufferToBase64(encrypted),
      updatedAt: Date.now()
    };
  }

  /**
   * Decrypts an encrypted payload back into a typed object.
   */
  static async decrypt<T>(payload: EncryptedPayload, passphrase?: string): Promise<T> {
    const salt = base64ToBuffer(payload.salt);
    const iv = base64ToBuffer(payload.iv);
    const ciphertext = base64ToBuffer(payload.ciphertext);

    const key = await this.getSessionKey(passphrase, salt);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted)) as T;
  }

  /**
   * Saves encrypted state to IndexedDB.
   */
  static async saveState(keyId: string, data: unknown, passphrase?: string): Promise<void> {
    const db = await openVaultDb();
    const encrypted = await this.encrypt(data, passphrase);

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({ id: keyId, ...encrypted });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Loads and decrypts state from IndexedDB.
   */
  static async loadState<T>(keyId: string, passphrase?: string): Promise<T | null> {
    const db = await openVaultDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(keyId);

      req.onsuccess = async () => {
        const record = req.result;
        if (!record) {
          resolve(null);
          return;
        }

        try {
          const payload: EncryptedPayload = {
            iv: record.iv,
            salt: record.salt,
            ciphertext: record.ciphertext,
            updatedAt: record.updatedAt
          };
          const decrypted = await OfflineVault.decrypt<T>(payload, passphrase);
          resolve(decrypted);
        } catch (err) {
          reject(err);
        }
      };

      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Destroys any active session key in runtime memory.
   */
  static wipeMemoryKey(): void {
    activeSessionKey = null;
    activeSessionPassphrase = '';
  }

  /**
   * Panic action: completely wipes the IndexedDB database and local caches.
   */
  static async panicWipeAll(): Promise<void> {
    this.wipeMemoryKey();
    return new Promise((resolve, reject) => {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = () => {
        sessionStorage.clear();
        resolve();
      };
      req.onerror = () => reject(req.error);
      req.onblocked = () => resolve(); // proceed even if blocked
    });
  }

  /**
   * Exports an encrypted JSON backup file string.
   */
  static exportBackupString(data: unknown): Promise<string> {
    return this.encrypt(data).then(payload => JSON.stringify(payload, null, 2));
  }
}
