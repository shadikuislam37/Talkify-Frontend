import { describe, it, expect, vi } from "vitest";
import { encryptMessage, decryptMessage } from "../crypto";
import { webcrypto } from "crypto";

// 🌟 ১. Node.js এনভায়রনমেন্টে window এবং crypto গ্লোবালি ডিফাইন করা
if (typeof window === "undefined") {
  (global as any).window = {
    crypto: webcrypto,
  };
}

// 🌟 ২. localStorage মক করার জন্য সিম্পল মেমোরি স্টোরেজ
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
});

describe("E2EE Cryptography Utility Tests", () => {
  it("should successfully encrypt and decrypt a plain text message", async () => {
    // 3. টেস্টের জন্য একটি ফেক RSA কি-পিয়ার জেনারেট করি
    const keyPair = await window.crypto.subtle.generateKey(
      { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
      true,
      ["encrypt", "decrypt"]
    );

    // 4. পাবলিক কি PEM ফরম্যাটে এক্সপোর্ট করা
    const pubKeyBuffer = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
    const publicKeyPem = btoa(String.fromCharCode(...new Uint8Array(pubKeyBuffer)));

    // 5. প্রাইভেট কি JWK ফরম্যাটে লোকালস্টোরেজে মক করা
    const privKeyObj = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
    const mockUserId = "test-user-123";
    localStorage.setItem(`priv_key_${mockUserId}`, JSON.stringify(privKeyObj));

    // 6. অরিজিনাল মেসেজ
    const plainText = "Hello, this is a secret end-to-end encrypted message!";

    // 7. এনক্রিপ্ট করি
    const encrypted = await encryptMessage(plainText, publicKeyPem);
    
    expect(encrypted.encryptedBody).toBeDefined();
    expect(encrypted.encryptedKey).toBeDefined();
    expect(encrypted.encryptedBody).not.toContain(plainText);

    // 8. ডিক্রিপ্ট করি
    const decryptedText = await decryptMessage(
      encrypted.encryptedBody, 
      encrypted.encryptedKey, 
      mockUserId
    );

    // 9. যাচাই করি
    expect(decryptedText).toBe(plainText);
  });
});