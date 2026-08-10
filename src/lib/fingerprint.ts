import fpjs from '@fingerprintjs/fingerprintjs';

let fpPromise: Promise<import('@fingerprintjs/fingerprintjs').Agent> | null = null;

export async function getVisitorId(): Promise<string> {
  try {
    if (!fpPromise) {
      fpPromise = fpjs.load();
    }
    const fp = await fpPromise;
    const result = await fp.get();
    return result.visitorId; // এটিই সেই ইউনিক হার্ডওয়্যার ফিঙ্গারপ্রিন্ট আইডি
  } catch (error) {
    console.error("Failed to generate fingerprint", error);
    return "unknown-device";
  }
}