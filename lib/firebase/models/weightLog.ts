// lib/firebase/models/weightLog.ts
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit as firestoreLimit,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../clientApp";

export interface WeightLog {
  id?: string;
  userId: string;
  weight: number;
  date: Date | Timestamp;
  note?: string;
  createdAt?: any;
}

/**
 * Log a new weight entry
 */
export async function logWeight(
  userId: string,
  weight: number,
  date?: Date,
  note?: string
): Promise<WeightLog> {
  try {
    const weightLogsCollectionRef = collection(db, "weightLogs");

    const now = serverTimestamp();
    const logDate = date || new Date();

    const weightLogData = {
      userId,
      weight,
      date: logDate,
      note: note || "",
      createdAt: now,
    };

    const docRef = await addDoc(weightLogsCollectionRef, weightLogData);

    return {
      id: docRef.id,
      userId,
      weight,
      date: logDate,
      note: note || "",
    };
  } catch (error) {
    console.error("Error logging weight:", error);
    throw new Error("Failed to log weight");
  }
}

/**
 * Get all weight logs for a user, ordered by date (newest first)
 */
export async function getWeightLogsByUser(
  userId: string,
  limit?: number
): Promise<WeightLog[]> {
  try {
    const weightLogsCollectionRef = collection(db, "weightLogs");

    let q = query(
      weightLogsCollectionRef,
      where("userId", "==", userId),
      orderBy("date", "desc")
    );

    // Add limit if specified
    if (limit && limit > 0) {
      q = query(q, firestoreLimit(limit));
    }

    const querySnapshot = await getDocs(q);

    const weightLogs: WeightLog[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      weightLogs.push({
        id: doc.id,
        ...data,
        date: data.date?.toDate ? data.date.toDate() : data.date,
      } as WeightLog);
    });

    return weightLogs;
  } catch (error) {
    console.error("Error getting weight logs:", error);
    throw new Error("Failed to get weight logs");
  }
}

/**
 * Get a single weight log by ID
 */
export async function getWeightLogById(id: string): Promise<WeightLog | null> {
  try {
    const weightLogRef = doc(db, "weightLogs", id);
    const weightLogSnap = await getDoc(weightLogRef);

    if (!weightLogSnap.exists()) {
      return null;
    }

    const data = weightLogSnap.data();
    return {
      id: weightLogSnap.id,
      ...data,
      date: data.date?.toDate ? data.date.toDate() : data.date,
    } as WeightLog;
  } catch (error) {
    console.error("Error getting weight log:", error);
    throw new Error("Failed to get weight log");
  }
}

/**
 * Update a weight log
 */
export async function updateWeightLog(
  id: string,
  updates: Partial<WeightLog>
): Promise<void> {
  try {
    const weightLogRef = doc(db, "weightLogs", id);

    // Don't allow changing userId
    const { userId, ...updateData } = updates;

    await updateDoc(weightLogRef, updateData);
  } catch (error) {
    console.error("Error updating weight log:", error);
    throw new Error("Failed to update weight log");
  }
}

/**
 * Delete a weight log
 */
export async function deleteWeightLog(id: string): Promise<void> {
  try {
    const weightLogRef = doc(db, "weightLogs", id);
    await deleteDoc(weightLogRef);
  } catch (error) {
    console.error("Error deleting weight log:", error);
    throw new Error("Failed to delete weight log");
  }
}

/**
 * Get the latest weight for a user
 */
export async function getLatestWeight(userId: string): Promise<number | null> {
  try {
    const weightLogs = await getWeightLogsByUser(userId, 1);

    if (weightLogs.length === 0) {
      return null;
    }

    return weightLogs[0].weight;
  } catch (error) {
    console.error("Error getting latest weight:", error);
    throw new Error("Failed to get latest weight");
  }
}

/**
 * Get weight change over a specified time period
 */
export async function getWeightChange(
  userId: string,
  days: number
): Promise<{
  startWeight: number | null;
  endWeight: number | null;
  change: number | null;
  logs: WeightLog[];
}> {
  try {
    // Get all logs
    const weightLogs = await getWeightLogsByUser(userId);

    if (weightLogs.length === 0) {
      return {
        startWeight: null,
        endWeight: null,
        change: null,
        logs: [],
      };
    }

    // Current date and start date
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Filter logs to the specified time period
    const filteredLogs = weightLogs.filter(
      (log) =>
        log.date instanceof Date && log.date >= startDate && log.date <= now
    );

    if (filteredLogs.length === 0) {
      return {
        startWeight: null,
        endWeight: null,
        change: null,
        logs: [],
      };
    }

    // Find earliest and latest weights in period
    const sortedLogs = [...filteredLogs].sort(
      (a, b) => (a.date as Date).getTime() - (b.date as Date).getTime()
    );

    const startWeight = sortedLogs[0].weight;
    const endWeight = sortedLogs[sortedLogs.length - 1].weight;
    const change = endWeight - startWeight;

    return {
      startWeight,
      endWeight,
      change,
      logs: sortedLogs,
    };
  } catch (error) {
    console.error("Error calculating weight change:", error);
    throw new Error("Failed to calculate weight change");
  }
}
