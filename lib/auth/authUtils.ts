// lib/auth/authUtils.ts - Enhanced with better logout handling
import { clearAllMessagesCaches } from "@/lib/ChatHistoryManager";
import { auth } from "@/lib/firebase/clientApp";
import {
  browserLocalPersistence,
  deleteUser,
  GoogleAuthProvider,
  setPersistence,
  signInWithPopup,
} from "firebase/auth";
import {
  signIn as nextAuthSignIn,
  signOut as nextAuthSignOut,
} from "next-auth/react";
import { createOrUpdateUser } from "../firebase/models/user";

/**
 * Google sign-in that handles both Firebase Auth and NextAuth,
 * ensuring the user is stored in Firestore, and sets up a NextAuth session.
 */
export const signInWithGoogle = async (
  callbackUrl = "/dashboard"
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Use browserLocalPersistence so the user stays logged in unless they sign out
    await setPersistence(auth, browserLocalPersistence);

    const provider = new GoogleAuthProvider();
    // Force user to pick an account each time
    provider.setCustomParameters({ prompt: "select_account" });

    // 1) Sign in with Firebase
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // 2) Create or update user in Firestore
    await createOrUpdateUser({
      id: user.uid,
      name: user.displayName || undefined,
      email: user.email || undefined,
      image: user.photoURL || undefined,
    });

    // 3) Sign in with NextAuth
    const nextAuthResult = await nextAuthSignIn("google", {
      redirect: false, // We'll handle the redirect ourselves
    });

    if (nextAuthResult?.error) {
      throw new Error(nextAuthResult.error);
    }

    // 4) Manually redirect to callback URL
    window.location.href = callbackUrl;
    return { success: true };
  } catch (error: any) {
    console.error("Google sign in error:", error);
    return {
      success: false,
      error: error.message || "Failed to sign in with Google",
    };
  }
};

/**
 * Extract and store AI learning data from chat histories before clearing them
 */
const extractLearningDataBeforeClear = (): void => {
  // Using the enhanced clearAllMessagesCaches function which now preserves learning data
  console.log("Extracting AI learning data before clearing messages...");
  // The logic is now contained in the clearAllMessagesCaches function
};

/**
 * Sign out from both Firebase and NextAuth, clearing localStorage chat caches.
 * This enhanced version ensures chat data is cleared but AI learning data is preserved.
 */
export const signOutFromAll = async (): Promise<boolean> => {
  try {
    if (typeof window === "undefined") return true;

    console.log("Starting comprehensive sign out process...");

    // 1) Extract AI learning data from message caches before clearing
    extractLearningDataBeforeClear();

    // 2) Clear all chat message caches (preserving learning data)
    clearAllMessagesCaches();

    // 3) Sign out from Firebase
    await auth.signOut();
    console.log("Signed out from Firebase");

    // 4) Sign out from NextAuth with redirect
    await nextAuthSignOut({ callbackUrl: "/" });
    console.log("Signed out from NextAuth");

    // 5) As a fallback, reload the page if redirect doesn't happen
    setTimeout(() => {
      window.location.href = "/";
    }, 500);

    return true;
  } catch (error) {
    console.error("Sign out error:", error);

    // Force logout by redirecting anyway
    window.location.href = "/";
    return false;
  }
};

/**
 * Delete user account from both Firebase and the database,
 * then sign out and redirect to home page.
 */
export const deleteUserAccount = async (): Promise<boolean> => {
  try {
    if (typeof window === "undefined") return false;

    console.log("Starting account deletion process...");

    // 1. Call the API endpoint to delete all user data in the database
    const response = await fetch("/api/user/delete", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to delete account data");
    }

    // 2. Get the current Firebase auth user
    const currentUser = auth.currentUser;
    if (currentUser) {
      // 3. Delete the Firebase auth user
      await deleteUser(currentUser);
      console.log("Firebase Auth user deleted");
    }

    // 4. Clear all local storage and caches
    clearAllMessagesCaches();
    localStorage.clear();
    sessionStorage.clear();
    console.log("All local storage cleared");

    // 5. Sign out from NextAuth
    await nextAuthSignOut({ callbackUrl: "/" });
    console.log("Signed out from NextAuth");

    // 6. Redirect to home page (fallback)
    setTimeout(() => {
      window.location.href = "/";
    }, 500);

    return true;
  } catch (error) {
    console.error("Account deletion error:", error);

    // Rethrow the error to be handled by the UI component
    throw error;
  }
};

export const validateAuthSession = async (session: any): Promise<boolean> => {
  if (!session || !session.user || !session.user.id) {
    return false;
  }

  try {
    // Make a lightweight request to validate the session is still active
    const response = await fetch("/api/user/profile", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // If the response is 401 Unauthorized, the session is invalid
    if (response.status === 401) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error validating session:", error);
    return false;
  }
};
