"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerUser } from "@/lib/auth/authService";
import { signInWithGoogle } from "@/lib/auth/authUtils";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FaGoogle } from "react-icons/fa";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  const { status } = useSession();
  const searchParams = useSearchParams();

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  // Get callback URL from search params or use default
  const callbackUrl = searchParams?.get("callbackUrl") || "/onboarding";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Register with Firebase
      await registerUser({
        name,
        email,
        password,
      });

      // Sign in with NextAuth (this will trigger a session)
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Failed to sign in after registration");
      } else {
        // Redirect to onboarding after successful registration
        router.push("/onboarding");
      }
    } catch (error: any) {
      // Handle Firebase-specific errors
      const errorCode = error.code;
      if (errorCode === "auth/email-already-in-use") {
        setError("Email already in use. Please sign in instead.");
      } else if (errorCode === "auth/invalid-email") {
        setError("Invalid email address.");
      } else if (errorCode === "auth/weak-password") {
        setError("Password is too weak. Please use a stronger password.");
      } else {
        setError(error.message || "An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError("");

    try {
      // Use our improved Google sign-in function
      const result = await signInWithGoogle("/onboarding");

      if (!result.success) {
        setError(result.error || "Failed to sign in with Google");
      }
      // No need to redirect - the signInWithGoogle function handles this
    } catch (error: any) {
      setError(error.message || "Failed to sign in with Google");
      setIsLoading(false);
    }
  };

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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>

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
              <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full mt-4 flex items-center justify-center gap-2"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <FaGoogle /> Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
