// app/admin/page.tsx
// This is your page component that renders the AdminPanel

"use client";

import AdminPanel from "@/components/AdminPanel";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        // In a real app, you'd make an API call like:
        // const response = await fetch('/api/auth/check-admin');
        // const data = await response.json();
        // setIsAdmin(data.isAdmin);

        // For demo purposes, simulate an API call with a longer timeout
        // to ensure the real check would have time to complete
        setTimeout(() => {
          // This would come from your API in a real app - set to true for testing
          const adminStatus = true;
          setIsAdmin(adminStatus);
          setIsLoading(false);

          // Only redirect if not admin
          if (!adminStatus) {
            toast.error("You don't have permission to access the admin panel");
            router.push("/dashboard");
          }
        }, 800);
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
        setIsLoading(false);
        toast.error("Error checking admin permissions");
        router.push("/dashboard");
      }
    };

    checkAdminStatus();
  }, [router]);

  // Show loading spinner while checking admin status
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Loading admin panel...
          </p>
        </div>
      </div>
    );
  }

  // Show the admin panel if the user is an admin
  return isAdmin ? <AdminPanel /> : null;
}
