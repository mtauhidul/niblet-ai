// lib/auth/authService.ts
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase/clientApp";
import { createOrUpdateUser, getUserProfile } from "../firebase/models/user";

// 🔹 Register new user
export async function registerUser({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}) {
  try {
    // Set persistence to LOCAL to keep user logged in
    await setPersistence(auth, browserLocalPersistence);

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Create user in Firestore
    await createOrUpdateUser({
      id: user.uid,
      name,
      email,
    });

    return { id: user.uid, email, name };
  } catch (error: any) {
    console.error("Registration error:", error);
    throw error;
  }
}

// 🔹 Sign in with email/password
export async function signInWithEmail(email: string, password: string) {
  try {
    // Set persistence to LOCAL to keep user logged in
    await setPersistence(auth, browserLocalPersistence);

    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return userCredential.user;
  } catch (error: any) {
    console.error("Email sign in error:", error);
    throw error;
  }
}

// 🔹 Sign in with Google (Optimized)
export async function signInWithGoogle() {
  try {
    // Set persistence to LOCAL to keep user logged in
    await setPersistence(auth, browserLocalPersistence);

    const userCredential = await signInWithPopup(auth, googleProvider);
    const user = userCredential.user;

    // Store user in Firestore
    await createOrUpdateUser({
      id: user.uid,
      name: user.displayName || undefined,
      email: user.email || undefined,
      image: user.photoURL || undefined,
    });

    return user;
  } catch (error: any) {
    console.error("Google sign in error:", error);
    throw error;
  }
}

// 🔹 Sign out
export async function signOut() {
  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    console.error("Sign out error:", error);
    throw error;
  }
}

// 🔹 Get user profile by ID
export async function getUserProfileById(userId: string) {
  try {
    const profile = await getUserProfile(userId);
    return profile;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

// 🔹 Update user profile
// lib/auth/authService.ts

// Update user profile
export async function updateUserProfile(userId: string, data: any) {
  try {
    const profile = await import("../firebase/models/user").then((module) =>
      module.createOrUpdateUserProfile(userId, data)
    );
    return profile;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}

// 🔹 Check if user exists and is authenticated
export async function checkUserAuthenticated() {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(!!user);
    });
  });
}

// 🔹 Get current Firebase user
export function getCurrentUser() {
  return auth.currentUser;
}
