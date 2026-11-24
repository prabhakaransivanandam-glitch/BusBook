import admin from 'firebase-admin';
import { config } from './env.js';

if (!admin.apps.length) {
  let credential;

  if (config.firebaseServiceAccount) {
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(config.firebaseServiceAccount);
    } catch {
      serviceAccount = JSON.parse(
        Buffer.from(config.firebaseServiceAccount, 'base64').toString('utf8'),
      );
    }
    credential = admin.credential.cert(serviceAccount);
  } else {
    credential = admin.credential.applicationDefault();
  }

  admin.initializeApp({
    credential,
    projectId: config.firebaseProjectId || undefined,
  });
}

export const firebaseAuth = admin.auth();
export const messaging = admin.messaging();
export default admin;
