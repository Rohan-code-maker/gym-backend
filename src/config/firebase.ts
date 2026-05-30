import admin from 'firebase-admin';
import { config } from './index';

let isInitialized = false;

export const initFirebase = () => {
  if (isInitialized) return;
  if (!config.firebase.projectId || !config.firebase.clientEmail || !config.firebase.privateKey) {
    console.warn('⚠️  Firebase credentials not configured — push notifications disabled');
    return;
  }
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: config.firebase.projectId,
      clientEmail: config.firebase.clientEmail,
      privateKey: config.firebase.privateKey,
    }),
  });
  isInitialized = true;
};

export const getMessaging = (): admin.messaging.Messaging | null => {
  if (!isInitialized) return null;
  return admin.messaging();
};
