// app/admin/page.tsx
"use client";

import AdminPanel from "@/components/AdminPanel";
import { db } from "@/lib/firebase/clientApp";
import { doc, getDoc } from "firebase/firestore";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (status === "loading") return;

      if (status === "unauthenticated") {
        router.push("/auth/signin");
        return;
      }

      if (!session?.user?.id) {
        toast.error("User ID not found in session");
        router.push("/dashboard");
        return;
      }

      try {
        console.log("Checking admin status for user ID:", session.user.id);

        // Check admin status using client-side Firebase
        const userProfileRef = doc(db, "userProfiles", session.user.id);
        const userProfileSnap = await getDoc(userProfileRef);

        console.log("User profile exists:", userProfileSnap.exists());

        if (userProfileSnap.exists()) {
          const userData = userProfileSnap.data();
          console.log("User data:", userData);
          const isAdmin = userData?.isAdmin === true;

          setIsAdmin(isAdmin);

          if (!isAdmin) {
            toast.error("You don't have permission to access the admin panel");
            router.push("/dashboard");
          }
        } else {
          console.log("User profile not found");
          toast.error("Admin profile not found");
          router.push("/dashboard");
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        toast.error("Failed to verify admin permissions");
        router.push("/dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, [session, status, router]);

  // Show loading spinner while checking admin status
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Verifying admin access...
          </p>
        </div>
      </div>
    );
  }

  // Show the admin panel if the user is an admin
  return isAdmin ? <AdminPanel /> : null;
}
