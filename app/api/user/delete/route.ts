// app/api/user/delete/route.ts
import { db } from "@/lib/firebase/clientApp";
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest) {
  try {
    // Get session token for authentication
    const token = await getToken({ req: request });

    if (!token?.sub) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = token.sub;

    // Keep track of deleted items for logging
    const deletedItems = {
      meals: 0,
      weightLogs: 0,
      userProfile: false,
      userDocument: false,
      assistantThreads: 0,
    };

    // Use Firestore batch operations to delete all user data
    // We'll use multiple batches since a single batch is limited to 500 operations
    let batch = writeBatch(db);
    let operationCount = 0;
    const MAX_OPERATIONS = 450; // Keep under the 500 limit with some buffer

    // Helper function to commit batch when approaching limits
    const commitBatchIfNeeded = async () => {
      operationCount++;
      if (operationCount >= MAX_OPERATIONS) {
        await batch.commit();
        batch = writeBatch(db);
        operationCount = 0;
        console.log(`Committed batch and created a new one.`);
      }
    };

    // 1. Delete user meals
    console.log(`Deleting meals for user ${userId}`);
    const mealsRef = collection(db, "meals");
    const mealsQuery = query(mealsRef, where("userId", "==", userId));
    const mealsSnapshot = await getDocs(mealsQuery);

    if (!mealsSnapshot.empty) {
      for (const document of mealsSnapshot.docs) {
        batch.delete(document.ref);
        deletedItems.meals++;
        await commitBatchIfNeeded();
      }
      console.log(`Found ${mealsSnapshot.size} meals to delete`);
    }

    // 2. Delete user weight logs
    console.log(`Deleting weight logs for user ${userId}`);
    const weightLogsRef = collection(db, "weightLogs");
    const weightQuery = query(weightLogsRef, where("userId", "==", userId));
    const weightSnapshot = await getDocs(weightQuery);

    if (!weightSnapshot.empty) {
      for (const document of weightSnapshot.docs) {
        batch.delete(document.ref);
        deletedItems.weightLogs++;
        await commitBatchIfNeeded();
      }
      console.log(`Found ${weightSnapshot.size} weight logs to delete`);
    }

    // 3. Check if there are threads/assistant data to delete
    // This could be in a collection like "threads" or similar
    try {
      const threadsRef = collection(db, "threads");
      const threadsQuery = query(threadsRef, where("userId", "==", userId));
      const threadsSnapshot = await getDocs(threadsQuery);

      if (!threadsSnapshot.empty) {
        for (const document of threadsSnapshot.docs) {
          batch.delete(document.ref);
          deletedItems.assistantThreads++;
          await commitBatchIfNeeded();
        }
        console.log(
          `Found ${threadsSnapshot.size} assistant threads to delete`
        );
      }
    } catch (error) {
      // If the collection doesn't exist, this will fail silently
      console.log("No threads collection found or error accessing it:", error);
    }

    // 4. Delete user profile
    console.log(`Deleting user profile for user ${userId}`);
    const userProfileRef = doc(db, "userProfiles", userId);
    batch.delete(userProfileRef);
    deletedItems.userProfile = true;
    await commitBatchIfNeeded();

    // 5. Delete user document
    console.log(`Deleting user document for user ${userId}`);
    const userRef = doc(db, "users", userId);
    batch.delete(userRef);
    deletedItems.userDocument = true;
    await commitBatchIfNeeded();

    // Commit any remaining operations in the batch
    if (operationCount > 0) {
      await batch.commit();
      console.log(`Final batch committed with ${operationCount} operations.`);
    }

    console.log("Account deletion summary:", deletedItems);

    // Return success response
    return NextResponse.json({
      message: "User account and associated data deleted successfully",
      deletedItems,
    });
  } catch (error) {
    console.error("Error deleting user account:", error);
    return NextResponse.json(
      {
        message: "Failed to delete user account",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
