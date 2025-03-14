// hooks/useAdminStatus.ts
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

/**
 * React hook to check if the current user has admin privileges
 * Returns { isAdmin, loading }
 */
export function useAdminStatus() {
  const { data: session, status } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch admin status when session is loaded
    if (status === "loading") return;

    async function checkAdminStatus() {
      try {
        setLoading(true);

        // If not authenticated, user is not an admin
        if (status !== "authenticated" || !session?.user?.id) {
          setIsAdmin(false);
          return;
        }

        // Fetch admin status from API
        const response = await fetch("/api/user/admin-status");

        if (!response.ok) {
          console.error("Failed to fetch admin status:", response.statusText);
          setIsAdmin(false);
          return;
        }

        const data = await response.json();
        setIsAdmin(data.isAdmin === true);
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    checkAdminStatus();
  }, [session, status]);

  return { isAdmin, loading };
}
