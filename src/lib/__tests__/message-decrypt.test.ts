import { describe, it, expect, vi } from "vitest";

describe("Message Decryption Flow", () => {
  it("should process and decrypt raw messages array", async () => {
    const mockRawMessages = [
      { id: "1", body: "encrypted_text_1", encryptedKey: "key_1" },
      { id: "2", body: "plain_text_2", encryptedKey: null },
    ];

    // ডিক্রিপশন ফাংশন মক করা
    const mockDecrypt = vi.fn().mockResolvedValue("decrypted_text_1");

    const processedMessages = await Promise.all(
      mockRawMessages.map(async (msg) => {
        if (msg.body && msg.encryptedKey) {
          const plainText = await mockDecrypt(msg.body, msg.encryptedKey);
          return { ...msg, body: plainText };
        }
        return msg;
      })
    );

    expect(processedMessages[0].body).toBe("decrypted_text_1");
    expect(processedMessages[1].body).toBe("plain_text_2");
    expect(mockDecrypt).toHaveBeenCalledTimes(1);
  });
});