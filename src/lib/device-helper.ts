// src/lib/device-helper.ts
import { UAParser } from "ua-parser-js";

export function parseDeviceDetails(userAgentString: string = ""): { deviceName: string; browserName: string } {
  const parser = new UAParser(userAgentString);
  const result = parser.getResult();

  // ব্রাউজার নাম (যেমন: Chrome, Safari, Firefox)
  const browserName = result.browser.name 
    ? `${result.browser.name} ${result.browser.version ? `(${result.browser.version.split('.')[0]})` : ''}` 
    : "Unknown Browser";

  // ডিভাইস মডেল বা ব্র্যান্ড (যেমন: iPhone, Samsung Galaxy, MacBook ইত্যাদি)
  const vendor = result.device.vendor || "";
  const model = result.device.model || "";
  const osName = result.os.name || "";
  const osVersion = result.os.version || "";

  let deviceName = "";

  if (model) {
    // যদি সরাসরি রিয়েল ডিভাইস মডেল পাওয়া যায় (যেমন: iPhone, Pixel 7 ইত্যাদি)
    deviceName = vendor && !model.toLowerCase().includes(vendor.toLowerCase()) 
      ? `${vendor} ${model}` 
      : model;
  } else if (result.device.type) {
    // যদি মডেল না পেয়ে ডিভাইসের টাইপ থাকে (Mobile, Tablet, Console ইত্যাদি)
    deviceName = `${result.device.type.charAt(0).toUpperCase() + result.device.type.slice(1)}`;
  } else {
    // ডেস্কটপ বা ল্যাপটপের ক্ষেত্রে ওএস এর নাম দেখাবে (যেমন: Windows, Mac OS, Linux)
    deviceName = osName ? `${osName} ${osVersion}` : "Desktop PC";
  }

  return {
    deviceName: deviceName.trim() || "Unknown Device",
    browserName: browserName.trim(),
  };
}