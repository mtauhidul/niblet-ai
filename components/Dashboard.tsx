// components/Dashboard.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { LogOut, User } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ChatContainer from "./ChatContainer";
import TodaysMeals from "./TodaysMeals";
import { Button } from "./ui/button";

const Dashboard = ({ aiPersonality = "best-friend" }) => {
  const [caloriesConsumed, setCaloriesConsumed] = useState(0);
  const [caloriesRemaining, setCaloriesRemaining] = useState(2000);
  const [todaysMeals, setTodaysMeals] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Redirect to sign in if not authenticated
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchUserData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, router]);

  // Fetch user data and today's meals
  const fetchUserData = async () => {
    setIsLoading(true);
    try {
      // Fetch user profile
      const profileResponse = await fetch("/api/user/profile");
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setUserProfile(profileData);

        // Set target calories from user profile
        if (profileData.targetCalories) {
          setCaloriesRemaining(profileData.targetCalories);
        }
      }

      // Fetch today's meals
      const today = new Date().toISOString().split("T")[0];
      const mealsResponse = await fetch(`/api/meals?date=${today}`);
      if (mealsResponse.ok) {
        const mealsData = await mealsResponse.json();
        setTodaysMeals(mealsData);

        // Calculate calories consumed
        const consumed = mealsData.reduce(
          (total: number, meal: any) => total + (meal.calories || 0),
          0
        );
        setCaloriesConsumed(consumed);

        // Update calories remaining
        if (userProfile?.targetCalories) {
          setCaloriesRemaining(userProfile.targetCalories - consumed);
        } else {
          setCaloriesRemaining(2000 - consumed);
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="p-4 border-b dark:border-gray-800 flex justify-between items-center">
        <button className="p-2">
          <div className="w-6 h-0.5 bg-gray-800 dark:bg-gray-200 mb-1"></div>
          <div className="w-6 h-0.5 bg-gray-800 dark:bg-gray-200 mb-1"></div>
          <div className="w-6 h-0.5 bg-gray-800 dark:bg-gray-200"></div>
        </button>
        <div className="text-2xl font-bold">
          niblet<span className="text-blue-400">.ai</span>
        </div>
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => router.push("/profile")}
          >
            <User className="h-5 w-5" />
          </Button>
          <Button size="icon" variant="ghost" onClick={handleSignOut}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Calories Card */}
      <Card className="mx-4 mt-4">
        <CardContent className="p-0 flex">
          <div className="w-1/2 p-4 bg-green-200 dark:bg-green-900 rounded-l-xl">
            <div className="text-3xl font-bold text-center">
              {caloriesConsumed}
            </div>
            <div className="text-sm text-center">calories today</div>
          </div>
          <div className="w-1/2 p-4 rounded-r-xl">
            <div className="text-3xl font-bold text-center">
              {caloriesRemaining}
            </div>
            <div className="text-sm text-center">calories remaining</div>
          </div>
        </CardContent>
      </Card>

      {/* Chat Area - Using the ChatContainer component */}
      <div className="flex-1 overflow-hidden">
        <ChatContainer
          aiPersonality={userProfile?.aiPersonality || aiPersonality}
          threadId={userProfile?.threadId}
          assistantId={userProfile?.assistantId}
        />
      </div>

      {/* Today's Meals */}
      <div className="p-4 border-t dark:border-gray-800">
        <TodaysMeals meals={todaysMeals} />
      </div>
    </div>
  );
};

export default Dashboard;
