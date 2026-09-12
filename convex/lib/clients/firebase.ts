"use node";
import { initializeApp, getApps, cert, getApp, AppOptions, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  let credential: ReturnType<typeof cert> | undefined;
  let parsedProjectId: string | undefined;

  if (serviceAccountStr) {
    try {
      // Clean up surrounding single or double quotes if they were accidentally included
      const cleanedStr = serviceAccountStr.replace(/^['"]|['"]$/g, '').trim();
      const parsed = JSON.parse(cleanedStr) as Record<string, unknown>;
      const serviceAccount: ServiceAccount = {
        projectId: typeof parsed.project_id === 'string' ? parsed.project_id : (typeof parsed.projectId === 'string' ? parsed.projectId : undefined),
        clientEmail: typeof parsed.client_email === 'string' ? parsed.client_email : (typeof parsed.clientEmail === 'string' ? parsed.clientEmail : undefined),
        privateKey: typeof parsed.private_key === 'string' ? parsed.private_key : (typeof parsed.privateKey === 'string' ? parsed.privateKey : undefined),
      };
      credential = cert(serviceAccount);
      parsedProjectId = serviceAccount.projectId;
    } catch (error) {
      console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_KEY env var:', error);
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || parsedProjectId || 'gen-lang-client-0518918161';
  const config: AppOptions = { projectId };
  if (credential) {
    config.credential = credential;
  }
  initializeApp(config);
}

export const firebaseApp = getApp();
export const db = getFirestore(firebaseApp, 'default');
