/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js");

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Pass-through pour assurer l'installabilité PWA sans interférer avec le SSR / Supabase
});

firebase.initializeApp({
  apiKey: "AIzaSyBf8hxS3aI1XZu2D7TtWGqUiLUc74vQkKo",
  authDomain: "permis-b60c9.firebaseapp.com",
  projectId: "permis-b60c9",
  storageBucket: "permis-b60c9.firebasestorage.app",
  messagingSenderId: "540341275303",
  appId: "1:540341275303:web:0f6d36378e59325c8be982",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  // Si payload.notification est présent, FCM l'affiche déjà nativement.
  // On affiche manuellement uniquement pour les payloads data-only.
  if (payload.notification?.title) return;
  const title = payload.data?.title || "PermiConduit";
  const body = payload.data?.body || "";
  const link = payload.data?.link || "/";

  self.registration.showNotification(title, {
    body,
    icon: "/favicon.png",
    badge: "/logo-mark.png",
    vibrate: [200, 100, 200],
    silent: false,
    renotify: true,
    requireInteraction: true,
    tag: `permiconduit-${payload.data?.category || "general"}-${Date.now()}`,
    data: { link },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl =
    event.notification?.data?.link ||
    event.notification?.data?.FCM_MSG?.data?.link ||
    "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          client.navigate(targetUrl).catch(() => {});
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return undefined;
    }),
  );
});
