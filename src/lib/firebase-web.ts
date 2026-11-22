import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage, type MessagePayload } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBf8hxS3aI1XZu2D7TtWGqUiLUc74vQkKo",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "permis-b60c9.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "permis-b60c9",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "permis-b60c9.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "540341275303",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:540341275303:web:0f6d36378e59325c8be982",
};

function getFirebaseApp(): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

export async function isPushSupported(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return false;
  try {
    return await isSupported();
  } catch {
    return false;
  }
}

export function detectDeviceLabel(): string {
  if (typeof navigator === "undefined") return "Navigateur Web";
  const ua = navigator.userAgent;
  const os = /iPhone|iPad|iPod/i.test(ua)
    ? "iOS"
    : /Android/i.test(ua)
      ? "Android"
      : /Windows/i.test(ua)
        ? "Windows"
        : /Mac/i.test(ua)
          ? "macOS"
          : "Linux";
  const browser = /Edg/i.test(ua)
    ? "Edge"
    : /Chrome/i.test(ua)
      ? "Chrome"
      : /Firefox/i.test(ua)
        ? "Firefox"
        : /Safari/i.test(ua)
          ? "Safari"
          : "Navigateur";
  return `${browser} sur ${os}`;
}

export async function requestFcmToken(): Promise<{ token: string | null; reason?: string }> {
  const supported = await isPushSupported();
  if (!supported) {
    return { token: null, reason: "Votre navigateur ne prend pas en charge les notifications Push." };
  }

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    return {
      token: null,
      reason: "Clé VAPID manquante (VITE_FIREBASE_VAPID_KEY). Configurez-la dans vos variables d'environnement.",
    };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return {
      token: null,
      reason:
        permission === "denied"
          ? "Les notifications ont été bloquées dans votre navigateur. Autorisez-les dans les paramètres du site."
          : "Autorisation non accordée.",
    };
  }

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  await navigator.serviceWorker.ready;

  const messaging = getMessaging(getFirebaseApp());
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    return { token: null, reason: "Impossible d'obtenir un jeton de notification." };
  }
  return { token };
}

export async function listenForegroundMessages(
  callback: (payload: MessagePayload) => void,
): Promise<() => void> {
  const supported = await isPushSupported();
  if (!supported) return () => {};
  const messaging = getMessaging(getFirebaseApp());
  return onMessage(messaging, callback);
}
