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

const savePrivateKey = async (userId: string, privateKey: CryptoKey): Promise<void> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(privateKey, `priv_key_${userId}`); 
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const getPrivateKey = async (userId: string): Promise<CryptoKey | null> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(`priv_key_${userId}`);
    
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

// ==========================================
// 🌟 ২. Main E2EE Functions
// ==========================================

// কি-পিয়ার জেনারেট করে পাবলিক কি সার্ভারে পাঠানো এবং প্রাইভেট কি IndexedDB-তে রাখা
export async function initializeUserKeys(userId: string, updatePublicKeyApi: (key: string) => void) {
  let publicKeyPem = localStorage.getItem(`pub_key_${userId}`);
  const privateKey = await getPrivateKey(userId); // LocalStorage এর বদলে IDB চেক

  if (!publicKeyPem || !privateKey) {
    const keyPair = await window.crypto.subtle.generateKey(
      { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
      true, 
      ["encrypt", "decrypt"]
    );

    const pubKeyBuffer = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
    publicKeyPem = btoa(String.fromCharCode(...new Uint8Array(pubKeyBuffer)));

    // 🔴 সিকিউরিটি ম্যাজিক: প্রাইভেট কি JWK তে কনভার্ট না করে সরাসরি IDB তে সেভ করা হলো
    await savePrivateKey(userId, keyPair.privateKey);
    localStorage.setItem(`pub_key_${userId}`, publicKeyPem); // পাবলিক কি LocalStorage এ থাকলে সমস্যা নেই

    // সার্ভারে পাবলিক কি আপডেট করা
    await updatePublicKeyApi(publicKeyPem);
  }
}

// মেসেজ এনক্রিপ্ট করার ফাংশন (কোনো পরিবর্তন নেই)
export async function encryptMessage(plainText: string, recipientPublicKeyPem: string) {
  // ক. একটি র্যান্ডম AES Key তৈরি করা
  const aesKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedMessage = new TextEncoder().encode(plainText);

  // খ. আসল মেসেজ এনক্রিপ্ট করা
  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    encodedMessage
  );

  // গ. AES Key এক্সপোর্ট করা
  const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);

  // ঘ. প্রাপকের পাবলিক কি ইম্পোর্ট করা
  const binaryDer = Uint8Array.from(atob(recipientPublicKeyPem), c => c.charCodeAt(0));
  const recipientKey = await window.crypto.subtle.importKey(
    "spki",
    binaryDer.buffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );

  // ঙ. প্রাপকের পাবলিক কি দিয়ে AES Key এনক্রিপ্ট করা
  const encryptedAesKey = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    recipientKey,
    rawAesKey
  );

  return {
    encryptedBody: JSON.stringify({
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encryptedContent)),
    }),
    encryptedKey: btoa(String.fromCharCode(...new Uint8Array(encryptedAesKey))),
  };
}

// মেসেজ ডিক্রিপ্ট করার ফাংশন
export async function decryptMessage(encryptedBodyJson: string, encryptedKeyBase64: string, userId: string) {
  try {
    // 🌟 LocalStorage এর বদলে সরাসরি IndexedDB থেকে CryptoKey অবজেক্ট আনা হলো
    const privKey = await getPrivateKey(userId);
    if (!privKey) return "[Decryption Error: Private Key missing]";

    // ক. প্রাইভেট কি দিয়ে এনক্রিপ্টেড AES Key ডিক্রিপ্ট করা (importKey আর লাগছে না)
    const encryptedAesKeyBuffer = Uint8Array.from(atob(encryptedKeyBase64), c => c.charCodeAt(0));
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

    // খ. ডিক্রিপ্টেড AES Key এবং IV দিয়ে মূল মেসেজ ডিক্রিপ্ট করা
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
    return "[Encrypted Message]";
  }
}