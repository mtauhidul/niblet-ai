// lib/firebase/adminApp.ts
import * as admin from "firebase-admin";

// Prevent multiple initializations
let adminDb: FirebaseFirestore.Firestore;
let adminAuth: admin.auth.Auth;
let adminApp: admin.app.App;

if (!admin.apps.length) {
  try {
    // For local development, you can also use a local service account file
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (serviceAccountPath) {
      // Use the credentials from file
      adminApp = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    } else {
      // Use the credentials from environment variable
      const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

      if (!serviceAccountStr) {
        throw new Error(
          "Firebase Admin credentials not found in environment variables"
        );
      }

      let serviceAccount;
      try {
        serviceAccount = JSON.parse(serviceAccountStr);
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(
            `Error parsing service account JSON: ${error.message}`
          );
        } else {
          throw new Error("Error parsing service account JSON");
        }
      }

      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }

    adminDb = admin.firestore(adminApp);
    adminAuth = admin.auth(adminApp);

    console.log("Firebase Admin SDK initialized successfully");
  } catch (error) {
    console.error("Firebase Admin SDK initialization error:", error);

    // Create mock objects to prevent runtime errors
    adminDb = {
      collection: () => {
        throw new Error("Firebase Admin not properly initialized");
      },
    } as any;

    adminAuth = {
      getUser: () => {
        throw new Error("Firebase Admin not properly initialized");
      },
    } as any;
  }
} else {
  adminApp = admin.app();
  adminDb = admin.firestore(adminApp);
  adminAuth = admin.auth(adminApp);
}

export { adminAuth, adminDb };
