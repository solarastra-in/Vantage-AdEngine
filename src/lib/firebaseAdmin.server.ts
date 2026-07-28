/**
 * firebaseAdmin.server.ts
 *
 * Initializes the Firebase Admin SDK IF a service account is configured,
 * and returns null otherwise -- every caller must handle the null case,
 * so the app keeps working (falling back to its previous behavior) on a
 * deployment that hasn't provisioned a service account yet, rather than
 * crashing at import time.
 *
 * This is what items 2 and 3 from the stability review both need:
 *  - Real auth-derived orgId (verify a Firebase ID token's custom claims,
 *    instead of trusting a client-sent X-Org-Id header)
 *  - Server-side Firestore writes for credential metadata (instead of the
 *    client SDK writing directly, which is what the firestore.rules
 *    tightening a few rounds back was working around rather than solving)
 *
 * SETUP: set FIREBASE_SERVICE_ACCOUNT_KEY to the JSON contents of a
 * service account key (Firebase Console -> Project Settings -> Service
 * Accounts -> Generate new private key), or set GOOGLE_APPLICATION_CREDENTIALS
 * to a path to that JSON file (the standard Google Cloud convention).
 * Neither is set in this environment, so every function below returns null
 * until you provision one -- this file is real, correct code, not yet
 * exercised against a live project.
 */

import type { App } from 'firebase-admin/app';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

let app: App | null | undefined; // undefined = not yet attempted, null = attempted and unavailable

function initAdminApp(): App | null {
  if (app !== undefined) return app;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const hasAppDefaultCreds = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!serviceAccountJson && !hasAppDefaultCreds) {
    // eslint-disable-next-line no-console
    console.warn(
      '[firebaseAdmin] Neither FIREBASE_SERVICE_ACCOUNT_KEY nor GOOGLE_APPLICATION_CREDENTIALS ' +
      'is set. Admin-SDK-backed features (verified auth-derived orgId, server-side credential ' +
      'persistence) are disabled; falling back to their pre-Admin-SDK behavior.'
    );
    app = null;
    return null;
  }

  try {
    // Lazy require so a deployment with no service account never pays the
    // cost (or risk) of initializing the SDK at all.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { initializeApp, cert, applicationDefault, getApps } = require('firebase-admin/app');
    const existing = getApps();
    if (existing.length) {
      app = existing[0];
      return app;
    }

    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      app = initializeApp({ credential: cert(serviceAccount) });
    } else {
      app = initializeApp({ credential: applicationDefault() });
    }
    // eslint-disable-next-line no-console
    console.log('[firebaseAdmin] Admin SDK initialized successfully.');
    return app;
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[firebaseAdmin] Failed to initialize Admin SDK:', err.message);
    app = null;
    return null;
  }
}

export function getAdminAuth(): Auth | null {
  const a = initAdminApp();
  if (!a) return null;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getAuth } = require('firebase-admin/auth');
  return getAuth(a);
}

export function getAdminFirestore(): Firestore | null {
  const a = initAdminApp();
  if (!a) return null;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getFirestore } = require('firebase-admin/firestore');
  return getFirestore(a);
}

export function isAdminSdkConfigured(): boolean {
  return initAdminApp() !== null;
}

/** Test-only hook: force the cached app state so tests don't depend on real env vars or credentials. */
export function __resetAdminAppStateForTests(value: App | null | undefined = undefined): void {
  app = value;
}
