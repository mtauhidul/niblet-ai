// app/auth/signup/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function SignUpPage() {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();

  // Set mounted state after component mounts
  useEffect(() => {
    setMounted(true);
  }, []);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (mounted && status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router, mounted]);

  // Handle auth errors from URL
  useEffect(() => {
    if (!mounted) return;

    const errorParam = searchParams?.get("error");
    if (errorParam) {
      setError("An error occurred with authentication. Please try again.");
    }
  }, [searchParams, mounted]);

  // Handle Google sign in directly with NextAuth
  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      setIsLoading(true);
      // Use the standard NextAuth signIn method, redirect to onboarding for new users
      await signIn("google", { callbackUrl: "/onboarding" });
      // No need to handle success as NextAuth will redirect
    } catch (error) {
      console.error("Error signing up:", error);
      setError("Failed to sign up with Google");
      setIsGoogleLoading(false);
      setIsLoading(false);
    }
  };

  // Handle Facebook sign in directly with NextAuth
  const handleFacebookSignIn = async () => {
    try {
      setIsFacebookLoading(true);
      setIsLoading(true);
      // Use the standard NextAuth signIn method, redirect to onboarding for new users
      await signIn("facebook", { callbackUrl: "/onboarding" });
      // No need to handle success as NextAuth will redirect
    } catch (error) {
      console.error("Error signing up:", error);
      setError("Failed to sign up with Facebook");
      setIsFacebookLoading(false);
      setIsLoading(false);
    }
  };

  // Prevent hydration errors by not rendering until mounted
  if (!mounted) {
    return null;
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="text-3xl font-bold mb-6">
            niblet<span className="text-blue-400">.ai</span>
          </div>
          <CardTitle className="text-2xl">Create an Account</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Google Sign Up Button */}
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              {isGoogleLoading ? (
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  className="h-5 w-5"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                  <path d="M1 1h22v22H1z" fill="none" />
                </svg>
              )}
              {isGoogleLoading ? "Signing up..." : "Sign up with Google"}
            </Button>

            {/* Facebook Sign Up Button */}
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2 bg-[#1877F2] hover:bg-[#166FE5] text-white"
              onClick={handleFacebookSignIn}
              disabled={isLoading}
            >
              {isFacebookLoading ? (
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 320 512"
                  className="h-5 w-5 fill-current"
                >
                  <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" />
                </svg>
              )}
              {isFacebookLoading ? "Signing up..." : "Sign up with Facebook"}
            </Button>
          </div>

          <div className="mt-4 text-center text-sm">
            <p>
              Already have an account?{" "}
              <Link
                href="/auth/signin"
                className="text-blue-500 hover:text-blue-600"
              >
                Sign In
              </Link>
            </p>
          </div>

          <div className="relative mt-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <Link href="/" className="px-4 bg-gray-50 dark:bg-gray-800">
                Back to Home
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
