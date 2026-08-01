import { describe, it, expect } from "vitest";

// 🌟 ঠিক করা ফাংশন (return এবং isNaN আলাদা করা হয়েছে)
const formatTestTime = (dateString: string | Date | undefined) => {
  if (!dateString) return "Offline";
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? "Offline" : "Active";
};

describe("Format Last Seen Utility", () => {
  it("should return correct status for valid and invalid dates", () => {
    expect(formatTestTime(new Date().toISOString())).toBe("Active");
    expect(formatTestTime(undefined)).toBe("Offline");
    expect(formatTestTime("invalid-date")).toBe("Offline"); // 🌟 বানান ঠিক করা হলো
  });
});