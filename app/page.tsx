// app/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  // Set mounted state to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only run after mounting and status is resolved
    if (!mounted) return;

    // If authenticated, redirect to dashboard
    if (status === "authenticated") {
      router.push("/dashboard");
    } else if (status !== "loading") {
      setLoading(false);
    }
  }, [status, router, mounted]);

  // Prevent hydration errors by not rendering until mounted
  if (!mounted) {
    return null;
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Loading Niblet.ai...
          </p>
        </div>
      </div>
    );
  }

  // If not logged in, show landing page
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="p-6 border-b dark:border-gray-800">
        <div className="max-w-screen-xl mx-auto flex justify-between items-center">
          <div className="text-3xl font-bold">
            niblet<span className="text-blue-400">.ai</span>
          </div>
          <div className="flex space-x-4">
            <Button
              variant="outline"
              onClick={() => router.push("/auth/signin")}
            >
              Sign In
            </Button>
            <Button
              className="bg-blue-500 hover:bg-blue-600"
              onClick={() => router.push("/auth/signup")}
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-12 px-6">
          <div className="max-w-screen-xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              The AI-Powered Meal Tracking Assistant
            </h1>
            <p className="text-xl mb-8 max-w-2xl mx-auto text-gray-600 dark:text-gray-300">
              Chat with Nibble to log meals, track calories, and reach your
              nutrition goals - no manual entry required.
            </p>
            <Button
              size="lg"
              className="bg-blue-500 hover:bg-blue-600"
              onClick={() => router.push("/auth/signup")}
            >
              Start Tracking
            </Button>

            {/* App Mockup */}
            <div className="mt-12 max-w-sm mx-auto border-8 border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="bg-gray-800 py-2 relative">
                <div className="w-16 h-1 bg-gray-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full"></div>
              </div>
              <div className="bg-white dark:bg-gray-900 p-4">
                <div className="text-2xl font-bold mb-4 text-center">
                  niblet<span className="text-blue-400">.ai</span>
                </div>

                <div className="flex mb-4">
                  <div className="w-1/2 p-4 bg-green-200 dark:bg-green-900 rounded-l-lg">
                    <div className="text-3xl font-bold text-center">386</div>
                    <div className="text-sm text-center">calories today</div>
                  </div>
                  <div className="w-1/2 p-4 bg-gray-100 dark:bg-gray-800 rounded-r-lg">
                    <div className="text-3xl font-bold text-center">1414</div>
                    <div className="text-sm text-center">
                      calories remaining
                    </div>
                  </div>
                </div>

                <div className="mb-4 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm">
                    What would you like to do? Log a meal. Ask me to estimate
                    calories for a dish. Get a recipe recommendation.
                  </p>
                </div>

                <div className="p-3 bg-blue-500 text-white rounded-lg text-sm ml-auto max-w-[80%] mb-4">
                  I had a chicken salad for lunch
                </div>

                <div className="p-3 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm mr-auto max-w-[80%] mb-4">
                  Great choice! I've logged your chicken salad lunch. That's
                  approximately 350 calories with 30g of protein. You're doing
                  great today!
                </div>

                <div className="flex items-center mt-4 border-t pt-4">
                  <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 text-sm">
                    Message Nibble...
                  </div>
                  <div className="ml-2 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M22 2L11 13"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M22 2L15 22L11 13L2 9L22 2Z"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="bg-gray-800 py-4 relative">
                <div className="w-12 h-12 bg-gray-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gray-500"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-12 px-6 bg-gray-100 dark:bg-gray-800">
          <div className="max-w-screen-xl mx-auto">
            <h2 className="text-3xl font-bold mb-12 text-center">
              How Niblet.ai Works
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
                      stroke="#3B82F6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Chat-Based Tracking</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Simply tell Nibble what you ate in natural language. No need
                  to search databases or scan barcodes.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 20V10"
                      stroke="#3B82F6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M18 20V4"
                      stroke="#3B82F6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M6 20V16"
                      stroke="#3B82F6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Smart Analytics</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  View your progress with intuitive charts and get AI-powered
                  insights about your nutrition patterns.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M20 21V5C20 4.46957 19.7893 3.96086 19.4142 3.58579C19.0391 3.21071 18.5304 3 18 3H6C5.46957 3 4.96086 3.21071 4.58579 3.58579C4.21071 3.96086 4 4.46957 4 5V21"
                      stroke="#3B82F6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 12H12.01"
                      stroke="#3B82F6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9 12H9.01"
                      stroke="#3B82F6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M15 12H15.01"
                      stroke="#3B82F6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9 16H9.01"
                      stroke="#3B82F6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M12 16H12.01"
                      stroke="#3B82F6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M15 16H15.01"
                      stroke="#3B82F6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">
                  Personalized Assistant
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Choose your AI personality: Best Friend, Professional Coach,
                  or Tough Love to match your motivation style.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-6 text-center">
          <div className="max-w-screen-xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">
              Ready to transform your nutrition tracking?
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto text-gray-600 dark:text-gray-300">
              Join thousands of users who have made meal tracking effortless
              with Niblet.ai
            </p>
            <Button
              size="lg"
              className="bg-blue-500 hover:bg-blue-600"
              onClick={() => router.push("/auth/signup")}
            >
              Start For Free
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 border-t dark:border-gray-800">
        <div className="max-w-screen-xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="text-2xl font-bold mb-4 md:mb-0">
            niblet<span className="text-blue-400">.ai</span>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            © {new Date().getFullYear()} Niblet.ai. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
