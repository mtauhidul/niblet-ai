// app/admin-setup/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/firebase/clientApp";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";

// Set this to whatever secret you want to use - hardcoded for simplicity
// In a real app, you'd use an environment variable
const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SETUP_SECRET;

export default function AdminSetupPage() {
  const { data: session, status } = useSession();
  const [secret, setSecret] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSetupAdmin = async () => {
    if (!secret) {
      toast.error("Please enter the admin setup secret");
      return;
    }

    if (secret !== ADMIN_SECRET) {
      toast.error("Invalid secret key");
      return;
    }

    if (!session?.user?.id) {
      toast.error("No user ID found in session");
      return;
    }

    try {
      setIsLoading(true);

      // Get reference to the user profile document
      const userProfileRef = doc(db, "userProfiles", session.user.id);
      const userProfileSnap = await getDoc(userProfileRef);

      if (userProfileSnap.exists()) {
        // Update existing profile
        await updateDoc(userProfileRef, {
          isAdmin: true,
          updatedAt: new Date(),
        });
      } else {
        // Create new profile
        await setDoc(userProfileRef, {
          userId: session.user.id,
          email: session.user.email,
          name: session.user.name,
          isAdmin: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      toast.success("Admin access granted successfully!");
      setSuccess(true);
    } catch (error) {
      console.error("Error setting up admin:", error);
      if (error instanceof Error) {
        toast.error(`Failed to set up admin: ${error.message}`);
      } else {
        toast.error("Failed to set up admin: An unknown error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">
              Authentication Required
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-4">
              Please sign in to access the admin setup page.
            </p>
            <Button onClick={() => (window.location.href = "/auth/signin")}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Admin Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-md text-yellow-800 dark:text-yellow-200 text-sm">
              <p>
                This page allows you to grant admin privileges to your account.
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-2">
                Current user: {session?.user?.email}
              </p>
              <p className="text-sm text-gray-500 mb-2">
                User ID: {session?.user?.id}
              </p>
            </div>

            {success ? (
              <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-md text-green-800 dark:text-green-200">
                <p className="font-medium">
                  Admin access granted successfully!
                </p>
                <div className="mt-3">
                  <Button
                    onClick={() => (window.location.href = "/admin")}
                    className="w-full"
                  >
                    Go to Admin Panel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label htmlFor="secret" className="text-sm font-medium">
                    Admin Setup Secret
                  </label>
                  <Input
                    id="secret"
                    type="password"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="Enter the admin setup secret"
                  />
                </div>

                <Button
                  onClick={handleSetupAdmin}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                      Processing...
                    </>
                  ) : (
                    "Grant Admin Access"
                  )}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
