// src/lib/crypto.ts

// ==========================================
// 🌟 ১. IndexedDB Helper Functions
// ==========================================
const DB_NAME = "talkity-e2ee-db";
const STORE_NAME = "keys";

const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const savePrivateKey = async (userId: string, privateKey: CryptoKey): Promise<void> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(privateKey, `priv_key_${userId}`);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getPrivateKey = async (userId: string): Promise<CryptoKey | null> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(`priv_key_${userId}`);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

// নতুন: local key মুছে ফেলার হেল্পার — "Forgot PIN / Reset Keys" ফ্লো এর জন্য দরকার
export const deletePrivateKey = async (userId: string): Promise<void> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(`priv_key_${userId}`);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// ==========================================
// 🌟 ২. Main E2EE Functions
// ==========================================

// কি-পিয়ার জেনারেট করে পাবলিক কি সার্ভারে পাঠানো এবং প্রাইভেট কি IndexedDB-তে রাখা
// force: true দিলে existing key থাকলেও নতুন keypair বানাবে (reset flow-এর জন্য)
export async function initializeUserKeys(
  userId: string,
  updatePublicKeyApi: (key: string) => Promise<any> | void,
  force: boolean = false
) {
  // Local storage থেকে আর খুঁজবো না, শুধু IndexedDB তে Private Key আছে কি না দেখবো
  const privateKey = await getPrivateKey(userId);

  if (force || !privateKey) {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );

    const pubKeyBuffer = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
    const publicKeyPem = btoa(String.fromCharCode(...new Uint8Array(pubKeyBuffer)));

    await savePrivateKey(userId, keyPair.privateKey); // Private key IndexedDB তে সেভ
    await updatePublicKeyApi(publicKeyPem); // Public key ডাটাবেসে/সার্ভারে পাঠানো হচ্ছে
  }
}

export interface MessageKeyEntry {
  userId: string;
  encryptedKey: string;
}

export interface Recipient {
  userId: string;
  publicKeyPem: string;
}

// মেসেজ এনক্রিপ্ট করার ফাংশন (multi-recipient — group chat সাপোর্ট করে)
// recipients এ conversation-এর প্রতিটা মেম্বার থাকবে, sender নিজেও একজন হিসেবে
// (নিজের পাঠানো মেসেজ পরে নিজে পড়তে পারার জন্য)
export async function encryptMessage(
  plainText: string,
  recipients: Recipient[]
): Promise<{ encryptedBody: string; keys: MessageKeyEntry[] }> {
  if (!recipients || recipients.length === 0) {
    throw new Error("At least one recipient with a public key is required to encrypt a message.");
  }

  const aesKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedMessage = new TextEncoder().encode(plainText);

  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    encodedMessage
  );

  const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);

  const encryptAesKeyWithPublicKey = async (pem: string) => {
    const binaryDer = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
    const publicKey = await window.crypto.subtle.importKey(
      "spki",
      binaryDer.buffer,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["encrypt"]
    );
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      publicKey,
      rawAesKey
    );
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  };

  // প্রতিটা recipient-এর জন্য আলাদা এনক্রিপ্টেড key — group সাইজ যত বড়ই হোক, সমান কাজ করে
  const keys: MessageKeyEntry[] = await Promise.all(
    recipients.map(async (r) => ({
      userId: r.userId,
      encryptedKey: await encryptAesKeyWithPublicKey(r.publicKeyPem),
    }))
  );

  return {
    encryptedBody: JSON.stringify({
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encryptedContent)),
    }),
    keys,
  };
}

// মেসেজ ডিক্রিপ্ট করার ফাংশন (multi-recipient) — messageKeys array থেকে নিজের userId
// দিয়ে সঠিক encryptedKey খুঁজে বের করে decrypt করে
export async function decryptMessage(
  encryptedBodyJson: string,
  messageKeys: MessageKeyEntry[] | undefined | null,
  userId: string
) {
  try {
    if (!messageKeys || messageKeys.length === 0) {
      return "[Decryption Error: No keys attached to this message]";
    }

    const myKeyEntry = messageKeys.find((k) => k.userId === userId);
    if (!myKeyEntry) {
      // সাধারণত এটা তখন হয় যখন এই মেসেজ পাঠানোর সময় ইউজারটা এই conversation-এর মেম্বার ছিল না
      // (যেমন group-এ পরে যোগ হওয়া মেম্বার, যার backfill এখনো হয়নি)
      return "🔒 You don't have access to this message";
    }

    const privKey = await getPrivateKey(userId);
    if (!privKey) return "[Decryption Error: Private Key missing]";

    const encryptedAesKeyBuffer = Uint8Array.from(atob(myKeyEntry.encryptedKey), (c) => c.charCodeAt(0));
    const rawAesKey = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privKey,
      encryptedAesKeyBuffer
    );

    const aesKey = await window.crypto.subtle.importKey(
      "raw",
      rawAesKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );

    const parsedBody = JSON.parse(encryptedBodyJson);
    const iv = new Uint8Array(parsedBody.iv);
    const data = new Uint8Array(parsedBody.data);

    const decryptedContent = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      aesKey,
      data
    );

    return new TextDecoder().decode(decryptedContent);
  } catch (err) {
    return "🔒 This message can no longer be seen";
  }
}

// নিজের public key localStorage থেকে বের করার হেল্পার — recipients লিস্টে নিজেকে যোগ করতে দরকার
export function getMyPublicKeyPem(userId: string): string | null {
  return localStorage.getItem(`pub_key_${userId}`);
}

// ==========================================
// 🌟 ৪. Group History Backfill (Messenger-এর মতো "নতুন মেম্বার পুরনো মেসেজ দেখতে পাবে")
// ==========================================
// নতুন মেম্বার group-এ যোগ হলে, existing মেম্বারদের একজনের browser (যার private key আছে)
// পুরনো মেসেজের AES key নিজের কাছে decrypt করে নতুন মেম্বারের public key দিয়ে re-encrypt করে —
// সার্ভার কখনো plaintext AES key দেখে না, শুধু ferry করে। এই ফাংশনটা pure/framework-agnostic:
// শুধু ইনপুট নেয়, নেটওয়ার্ক কল নিজে করে না (সেটা caller-এর দায়িত্ব)।
export async function computeBackfillEntriesForNewMember(
  messages: { id: string; keys: MessageKeyEntry[] }[],
  myUserId: string,
  newMemberPublicKeyPem: string
): Promise<{ messageId: string; encryptedKey: string }[]> {
  const myPrivKey = await getPrivateKey(myUserId);
  if (!myPrivKey) {
    throw new Error("Private key missing on this device — cannot backfill history.");
  }

  const binaryDer = Uint8Array.from(atob(newMemberPublicKeyPem), (c) => c.charCodeAt(0));
  const newMemberPubKey = await window.crypto.subtle.importKey(
    "spki",
    binaryDer.buffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );

  const entries: { messageId: string; encryptedKey: string }[] = [];

  for (const msg of messages) {
    const myKeyEntry = msg.keys.find((k) => k.userId === myUserId);
    if (!myKeyEntry) continue; // এই মেসেজের key আমার কাছেও নেই (edge case) — স্কিপ

    const encryptedAesKeyBuffer = Uint8Array.from(atob(myKeyEntry.encryptedKey), (c) => c.charCodeAt(0));
    const rawAesKey = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      myPrivKey,
      encryptedAesKeyBuffer
    );

    const reEncrypted = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      newMemberPubKey,
      rawAesKey
    );

    entries.push({
      messageId: msg.id,
      encryptedKey: btoa(String.fromCharCode(...new Uint8Array(reEncrypted))),
    });
  }

  return entries;
}

// ==========================================
// 🌟 ৩. PIN-Based Multi-Device Key Backup System
// ==========================================

// OWASP 2023 রেকমেন্ডেশন অনুযায়ী PBKDF2-SHA256 এর জন্য কমপক্ষে ৬,০০,০০০ iteration
// (আগের 100,000 ছিল দুর্বল, বিশেষত ৪-৬ digit PIN-এর মতো low-entropy secret এর জন্য)
const PBKDF2_ITERATIONS = 600_000;

// ১. পিন দিয়ে প্রাইভেট কি এনক্রিপ্ট করে ব্যাকআপ করার ফাংশন
export async function backupPrivateKeyWithPIN(userId: string, userPin: string): Promise<string> {
  const privKey = await getPrivateKey(userId);
  if (!privKey) throw new Error("Private Key missing in IndexedDB");

  // Private Key PKCS8 এ এক্সপোর্ট
  const pkcs8KeyBuffer = await window.crypto.subtle.exportKey("pkcs8", privKey);

  const encoder = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(userPin),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const derivedKey = await window.crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedKeyBuf = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    derivedKey,
    pkcs8KeyBuffer
  );

  const combined = new Uint8Array(salt.length + iv.length + encryptedKeyBuf.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encryptedKeyBuf), salt.length + iv.length);

  return btoa(String.fromCharCode(...combined));
}

// ২. নতুন ডিভাইসে পিন দিয়ে প্রাইভেট কি রিকভার ও IndexedDB-তে সেভ করার ফাংশন
export async function restorePrivateKeyWithPIN(
  userId: string,
  backupBase64: string,
  userPin: string
): Promise<void> {
  const combined = Uint8Array.from(atob(backupBase64), (c) => c.charCodeAt(0));

  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertext = combined.slice(28);

  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(userPin),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const derivedKey = await window.crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  // ভুল PIN দিলে AES-GCM auth tag mismatch হয়ে এখানেই throw করবে — এটাই আমাদের "wrong PIN" সিগন্যাল
  const decryptedPkcs8Buf = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    derivedKey,
    ciphertext
  );

  // PKCS8 থেকে CryptoKey অবজেক্টে কনভার্ট
  const restoredPrivKey = await window.crypto.subtle.importKey(
    "pkcs8",
    decryptedPkcs8Buf,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"]
  );

  // নতুন ডিভাইসের IndexedDB তে সেভ
  await savePrivateKey(userId, restoredPrivKey);
}