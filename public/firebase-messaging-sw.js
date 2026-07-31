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
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title || "New Message";
  const notificationOptions = {
    body: payload.notification.body || "You have a new message.",
    icon: "/logo.png"
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});