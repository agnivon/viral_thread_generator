"use node";
import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  let credential;

  if (serviceAccountStr) {
    try {
      // Clean up surrounding single or double quotes if they were accidentally included
      const cleanedStr = serviceAccountStr.replace(/^['"]|['"]$/g, '').trim();
      const serviceAccount = JSON.parse(cleanedStr);
      credential = cert(serviceAccount);
    } catch (error) {
      console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_KEY env var:', error);
    }
  }

  initializeApp({
    credential,
    projectId: 'gen-lang-client-0518918161',
  });
}

export const firebaseApp = getApp();
export const db = getFirestore(firebaseApp, 'default');
