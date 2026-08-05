// ১. ফায়ারবেস কম্প্যাট স্ক্রিপ্ট লোড করা
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ২. ফায়ারবেস ইনিশিয়ালাইজ করা (এখানে process.env ব্যবহার করা যাবে না, সরাসরি মান বসাতে হবে)
firebase.initializeApp({
  apiKey: "AIzaSyDJhWMzZXUZTqTP41ybDOhI1ihrfALCqcE",
  authDomain: "talkify-8ef03.firebaseapp.com",
  projectId: "talkify-8ef03",
  storageBucket: "talkify-8ef03.firebasestorage.app",
  messagingSenderId: "1019124500348",
  appId: "1:1019124500348:web:c443455cb93415dcc946f9"
});

// ৩. মেসেজিং ইনিশিয়ালাইজ করা
const messaging = firebase.messaging();

// ৪. ব্যাকগ্রাউন্ড নোটিফিকেশন হ্যান্ডেল করা (ঐচ্ছিক কিন্তু উপকারী)
// ৪. ব্যাকগ্রাউন্ড নোটিফিকেশন হ্যান্ডেল করা
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  // 🌟 ফিক্স: notification আর data — দুই ফরম্যাটই সাপোর্ট করা হলো।
  // backend যদি data-only payload পাঠায় (notification key ছাড়া), তাহলে
  // payload.notification undefined হবে — সরাসরি .title অ্যাক্সেস করলে crash করত
  const notifData = payload.notification || {};
  const rawTitle = notifData.title || payload.data?.title;
  const rawBody = notifData.body || payload.data?.body;

  const notificationTitle = rawTitle?.trim() || "New Message";

  // 🌟 ফিক্স: raw encrypted JSON (ciphertext) কখনো সরাসরি না দেখানো — E2EE-তে
  // backend-এর কাছে decrypt করার key থাকে না, তাই সে যদি ভুলবশত raw encrypted
  // body পাঠায়ও, ইউজার যেন হিজিবিজি টেক্সটের বদলে একটা readable ফলব্যাক দেখে
  let displayBody = "You have a new message.";
  if (rawBody && !rawBody.trim().startsWith("{")) {
    displayBody = rawBody;
  }

  const notificationOptions = {
    body: displayBody,
    icon: "/icon.svg",
    badge: "/icon.svg",
    // 🌟 conversationId থাকলে tag হিসেবে ব্যবহার — একই কনভার্সেশনের একাধিক
    // নোটিফিকেশন স্ট্যাক না করে সবশেষটা রিপ্লেস করবে
    tag: payload.data?.conversationId || undefined,
    data: {
      conversationId: payload.data?.conversationId || null,
      url: payload.data?.conversationId
        ? `/chat?conversation=${payload.data.conversationId}`
        : "/chat",
    },
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// ৫. 🌟 নতুন: নোটিফিকেশনে ক্লিক করলে অ্যাপের সংশ্লিষ্ট চ্যাট ফোকাস/ওপেন করা
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/chat';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // ইতিমধ্যে খোলা কোনো ট্যাব থাকলে সেটাই ফোকাস করা, নতুন ট্যাব না খুলে
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // কোনো ট্যাব খোলা না থাকলে নতুন উইন্ডো খোলা
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});