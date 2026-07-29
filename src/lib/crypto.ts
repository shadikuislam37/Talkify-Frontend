// Keypair জেনারেট করার ফাংশন (User-এর প্রথম কানেকশনে)
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// Public Key কে string/PEM এ রূপান্তর (সার্ভারে সেভ করার জন্য)
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("spki", key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

// Base64 Public Key কে ব্যাক ডিকোড করার ফাংশন
export async function importPublicKey(pem: string): Promise<CryptoKey> {
  const binaryDer = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  return await window.crypto.subtle.importKey(
    "spki",
    binaryDer.buffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
}

// মেসেজ এনক্রিপ্ট করা (Sender Side)
export async function encryptMessage(text: string, publicKeyPem: string): Promise<string> {
  const publicKey = await importPublicKey(publicKeyPem);
  const encodedText = new TextEncoder().encode(text);
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    encodedText
  );
  return btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));
}

// মেসেজ ডিক্রিপ্ট করা (Receiver Side)
export async function decryptMessage(encryptedBase64: string, privateKey: CryptoKey): Promise<string> {
  try {
    const binaryBuffer = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      binaryBuffer.buffer
    );
    return new TextDecoder().decode(decryptedBuffer);
  } catch (err) {
    return "[Decryption Failed / Unreadable Message]";
  }
}