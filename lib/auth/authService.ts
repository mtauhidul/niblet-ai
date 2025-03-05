// lib/auth/authService.ts
import {
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../firebase/clientApp";
import {
  createOrUpdateUser,
  createOrUpdateUserProfile,
  getUserProfile,
} from "../firebase/models/user";

// Register new user
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
    // Create user in Firebase Auth
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
    throw new Error(error.message || "Failed to register user");
  }
}

// Sign in with email and password
export async function signInWithEmail(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return userCredential.user;
  } catch (error: any) {
    throw new Error(error.message || "Failed to sign in");
  }
}

// Sign in with Google
export async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);

    // Create or update user in Firestore
    await createOrUpdateUser({
      id: userCredential.user.uid,
      name: userCredential.user.displayName || undefined,
      email: userCredential.user.email || undefined,
      image: userCredential.user.photoURL || undefined,
    });

    return userCredential.user;
  } catch (error: any) {
    throw new Error(error.message || "Failed to sign in with Google");
  }
}

// Sign out
export async function signOut() {
  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    throw new Error(error.message || "Failed to sign out");
  }
}

// Update user profile
export async function updateUserProfile(userId: string, data: any) {
  try {
    return await createOrUpdateUserProfile(userId, data);
  } catch (error: any) {
    throw new Error(error.message || "Failed to update user profile");
  }
}

// Get user profile
export async function getUserProfileById(userId: string) {
  try {
    return await getUserProfile(userId);
  } catch (error: any) {
    throw new Error(error.message || "Failed to get user profile");
  }
}
