// lib/firebase/models/weightLog.ts
import {
  addDoc,
  collection,
  doc,
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
  createdAt?: any;
}

// Log weight
export async function logWeight(
  userId: string,
  weight: number,
  date?: Date
): Promise<WeightLog> {
  const weightLogsCollectionRef = collection(db, "weightLogs");

  const now = serverTimestamp();
  const logDate = date || new Date();

  const weightLogData = {
    userId,
    weight,
    date: logDate,
    createdAt: now,
  };

  const docRef = await addDoc(weightLogsCollectionRef, weightLogData);

  // Update user profile with current weight
  const userProfileRef = doc(db, "userProfiles", userId);
  await updateDoc(userProfileRef, {
    currentWeight: weight,
    updatedAt: now,
  });

  return {
    id: docRef.id,
    userId,
    weight,
    date: logDate,
  };
}

// Get weight logs by user
export async function getWeightLogsByUser(
  userId: string
): Promise<WeightLog[]> {
  const weightLogsCollectionRef = collection(db, "weightLogs");

  const q = query(
    weightLogsCollectionRef,
    where("userId", "==", userId),
    orderBy("date", "desc")
  );

  const querySnapshot = await getDocs(q);

  const weightLogs: WeightLog[] = [];
  querySnapshot.forEach((doc) => {
    weightLogs.push({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate() || new Date(),
    } as WeightLog);
  });

  return weightLogs;
}
