// app/auth/error/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function AuthErrorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string>(
    "An authentication error occurred."
  );
  const [errorType, setErrorType] = useState<string>("");

  useEffect(() => {
    const error = searchParams?.get("error");
    setErrorType(error || "");

    if (error) {
      switch (error) {
        case "EmailExists":
        case "EmailAlreadyExists":
          setErrorMessage(
            "An account with this email already exists. Please sign in with your existing account instead."
          );
          break;
        case "SignInError":
          setErrorMessage(
            "Something went wrong during sign in. Please try again."
          );
          break;
        case "OAuthSignin":
        case "OAuthCallback":
          setErrorMessage(
            "There was a problem with the authentication provider. Please try again."
          );
          break;
        case "OAuthCreateAccount":
          setErrorMessage(
            "We couldn't create an account with the provided credentials. Please try a different method."
          );
          break;
        case "OAuthAccountNotLinked":
          setErrorMessage(
            "The email on this account is already linked to another provider. Please sign in using the original provider."
          );
          break;
        default:
          setErrorMessage(
            "An error occurred during authentication. Please try again."
          );
      }
    }
  }, [searchParams]);

  // Direct navigation with router instead of using Link
  // This gives us more control over the navigation
  const goToSignIn = () => {
    // Use replace instead of push to avoid keeping the error page in history
    router.replace("/auth/signin");
  };

  const goToHome = () => {
    router.replace("/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="text-3xl font-bold mb-6">
            niblet<span className="text-blue-400">.ai</span>
          </div>
          <CardTitle className="text-2xl text-red-600">
            Authentication Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 rounded-lg text-center">
            <p className="text-red-800 dark:text-red-200">{errorMessage}</p>

            {(errorType === "EmailExists" ||
              errorType === "EmailAlreadyExists") && (
              <p className="mt-2 text-sm">
                This means you already have an account with this email address.
                Try signing in instead.
              </p>
            )}
          </div>

          <div className="flex flex-col space-y-4">
            <Button onClick={goToSignIn}>Go to Sign In</Button>

            <Button variant="outline" onClick={goToHome}>
              Return to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
