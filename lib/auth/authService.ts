import {
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase/clientApp";
import { createOrUpdateUser } from "../firebase/models/user";

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

// 🔹 Sign in with email/password
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

// 🔹 Sign in with Google (Optimized)
export async function signInWithGoogle() {
  try {
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
    throw new Error(error.message || "Failed to sign in with Google");
  }
}

// 🔹 Sign out
export async function signOut() {
  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    throw new Error(error.message || "Failed to sign out");
  }
}
