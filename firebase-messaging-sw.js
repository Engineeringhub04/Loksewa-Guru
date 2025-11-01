// Import the Firebase app and messaging services
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// Initialize the Firebase app in the service worker
// Be sure to replace the config values with your own
const firebaseConfig = {
  apiKey: "AIzaSyD-ykyzzDcJ__WhbhOIFljrczWqj1xKwXU",
  authDomain: "loksewa-guru-94ba7.firebaseapp.com",
  projectId: "loksewa-guru-94ba7",
  storageBucket: "loksewa-guru-94ba7.appspot.com",
  messagingSenderId: "58948764913",
  appId: "1:58948764913:web:c79b6bde81f40f44f75550",
  measurementId: "G-62JHEL54T7"
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png' // Make sure you have a logo.png in your public folder
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
