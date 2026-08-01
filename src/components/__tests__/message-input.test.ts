import { describe, it, expect, vi } from "vitest";

describe("Chat Typing Indicator Logic", () => {
  it("should trigger typing start when text is entered", () => {
    const mockSocket = { emit: vi.fn() };
    const conversationId = "conv-123";
    const currentUserId = "user-1";
    
    const handleInputChange = (text: string) => {
      if (text.trim().length > 0) {
        mockSocket.emit("typing_start", { conversationId, userId: currentUserId });
      } else {
        mockSocket.emit("typing_stop", { conversationId, userId: currentUserId });
      }
    };

    handleInputChange("Hello");
    expect(mockSocket.emit).toHaveBeenCalledWith("typing_start", {
      conversationId,
      userId: currentUserId,
    });
  });
});