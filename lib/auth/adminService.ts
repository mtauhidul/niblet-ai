// lib/auth/adminService.ts
import { db } from "@/lib/firebase/clientApp";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getUserProfileById } from "./authService";

/**
 * Check if a user has admin privileges
 * @param userId The user ID to check
 * @returns Promise resolving to boolean indicating if user is admin
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  if (!userId) return false;

  try {
    const userProfile = await getUserProfileById(userId);
    return userProfile?.isAdmin === true;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

/**
 * Set admin status for a user
 * @param userId The user ID to update
 * @param isAdmin Boolean indicating if user should be admin
 * @returns Promise resolving to boolean indicating success
 */
export async function setUserAdminStatus(
  userId: string,
  isAdmin: boolean
): Promise<boolean> {
  if (!userId) return false;

  try {
    const profileRef = doc(db, "userProfiles", userId);

    // First check if the profile exists
    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {
      console.error("User profile does not exist:", userId);
      return false;
    }

    // Update the profile with the new admin status
    await updateDoc(profileRef, {
      isAdmin: isAdmin,
    });

    return true;
  } catch (error) {
    console.error("Error updating admin status:", error);
    return false;
  }
}

/**
 * One-time setup function to create the first admin user
 * This should be secured and only accessible with a special token
 * @param userId The user ID to make admin
 * @param setupToken A secret token to authorize this operation
 * @returns Promise resolving to boolean indicating success
 */
export async function setupFirstAdmin(
  userId: string,
  setupToken: string
): Promise<boolean> {
  // Validate setup token (should match environment variable)
  if (setupToken !== process.env.ADMIN_SETUP_TOKEN) {
    console.error("Invalid admin setup token");
    return false;
  }

  return setUserAdminStatus(userId, true);
}
