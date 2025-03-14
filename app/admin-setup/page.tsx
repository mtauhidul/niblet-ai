// app/admin-setup/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

/**
 * One-time admin setup page
 * This should ideally be a hidden route that only the app owner knows about
 */
export default function AdminSetupPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [token, setToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setError("Setup token is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ setupToken: token }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to setup admin account");
        toast.error(data.message || "Failed to setup admin account");
        return;
      }

      setSuccess("Admin account set up successfully!");
      toast.success("Admin account set up successfully!");

      // Redirect to admin panel after a short delay
      setTimeout(() => {
        console.log("Redirecting to admin panel...");
        // Refresh the page first to update admin status in session
        window.location.href = "/dashboard"; // Redirect to dashboard instead
      }, 2000);
    } catch (error) {
      console.error("Error setting up admin:", error);
      setError("An unexpected error occurred");
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // If not authenticated, show login prompt
  if (status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              You need to be logged in to set up an admin account.
            </p>
            <Button
              className="w-full"
              onClick={() => router.push("/auth/signin")}
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Admin Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-center">
            This page allows you to set up the first admin account for
            Niblet.ai.
          </p>

          {error && (
            <div className="bg-red-100 dark:bg-red-900 p-3 rounded-md text-red-800 dark:text-red-200 text-sm mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 dark:bg-green-900 p-3 rounded-md text-green-800 dark:text-green-200 text-sm mb-4">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1 text-sm font-medium">
                Setup Token
              </label>
              <Input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter your admin setup token"
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                This is the secret token defined in your environment variables.
              </p>
            </div>

            <div className="pt-2">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Setting up..." : "Set Up Admin Account"}
              </Button>
            </div>

            <div className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
              <p>
                This will grant admin privileges to the account:{" "}
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {session?.user?.email || "your current account"}
                </span>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
