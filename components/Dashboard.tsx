// components/Dashboard.tsx
"use client";

import { useChatManager } from "@/hooks/useChatManager";
import { PersonalityKey } from "@/lib/assistantService";
import { getUserProfileById } from "@/lib/auth/authService";
import { signOutFromAll } from "@/lib/auth/authUtils";
import { clearAllStorage } from "@/lib/ChatHistoryManager";
import { db } from "@/lib/firebase/clientApp";
import type { Meal } from "@/lib/firebase/models/meal";
import type { UserProfile } from "@/lib/firebase/models/user";
import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { ChevronDown, ChevronUp, Settings } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import CaloriesStatusBar from "./CaloriesStatusBar";
import ChatContainer from "./ChatContainer";
import CombinedWeightCalorieChart from "./CombinedWeightCalorieChart";
import HamburgerMenu from "./HamburgerMenu";
import TodaysMeals from "./TodaysMeals";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  initiallyExpanded?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  initiallyExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

  return (
    <div className="border rounded-lg mb-4 overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
      <button
        className="w-full flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 text-left font-medium"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {title}
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>
      {isExpanded && (
        <div className="p-4 animate-in slide-in-from-top-4 duration-300">
          {children}
        </div>
      )}
    </div>
  );
};

interface DashboardProps {
  aiPersonality?: PersonalityKey;
  onMealLogged?: () => void;
}

const Dashboard = ({
  aiPersonality: propAiPersonality = "best-friend",
  onMealLogged: propOnMealLogged = () => {},
}: DashboardProps) => {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // Use the chat manager hook for chat state management
  const {
    threadId: chatThreadId,
    assistantId,
    personality: aiPersonality,
    isInitializing: isChatInitializing,
    error: chatError,
    changePersonality,
  } = useChatManager(session?.user?.id);

  // Calories / meals data
  const [todaysMeals, setTodaysMeals] = useState<Meal[]>([]);
  const [caloriesConsumed, setCaloriesConsumed] = useState(0);
  const [caloriesRemaining, setCaloriesRemaining] = useState(0);
  const [targetCalories, setTargetCalories] = useState(2000);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [dateRange, setDateRange] = useState<
    "week" | "month" | "3months" | "year"
  >("month");

  const [isCalling, setIsCalling] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const toastShownRef = useRef(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Mark the component as mounted to avoid SSR mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const getTodayDateBounds = useMemo(() => {
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date().setHours(23, 59, 59, 999));
    return { startOfDay, endOfDay };
  }, []);

  const setupFirestoreListener = useCallback(() => {
    if (!session?.user?.id) return null;
    const { startOfDay, endOfDay } = getTodayDateBounds;

    try {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      const mealsQuery = query(
        collection(db, "meals"),
        where("userId", "==", session.user.id),
        where("date", ">=", startOfDay),
        where("date", "<=", endOfDay),
        orderBy("date", "desc")
      );
      const unsubscribe = onSnapshot(
        mealsQuery,
        (snapshot) => {
          const meals: Meal[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            meals.push({
              id: doc.id,
              ...data,
              date:
                data.date instanceof Timestamp
                  ? data.date.toDate()
                  : new Date(data.date),
            } as Meal);
          });
          setTodaysMeals(meals);
          const total = meals.reduce(
            (sum, m) => sum + (Number(m.calories) || 0),
            0
          );
          setCaloriesConsumed(total);
          setCaloriesRemaining(targetCalories - total);
          setIsLoading(false);
          setIsRefreshing(false);
        },
        (err) => {
          console.error("Error in Firestore listener:", err);
          setLoadingError("Error getting real-time updates. Please refresh.");
          setIsLoading(false);
          setIsRefreshing(false);
        }
      );
      unsubscribeRef.current = unsubscribe;
      return unsubscribe;
    } catch (err) {
      console.error("Error setting up listener:", err);
      setLoadingError("Error setting up data connection. Please refresh.");
      setIsLoading(false);
      setIsRefreshing(false);
      return null;
    }
  }, [session?.user?.id, getTodayDateBounds, targetCalories]);

  // Basic manual fetch fallback
  const fetchTodaysMeals = useCallback(async () => {
    if (!session?.user?.id) return;
    setIsRefreshing(true);
    try {
      const { startOfDay, endOfDay } = getTodayDateBounds;
      const qSnap = await getDocs(
        query(
          collection(db, "meals"),
          where("userId", "==", session.user.id),
          where("date", ">=", startOfDay),
          where("date", "<=", endOfDay),
          orderBy("date", "desc")
        )
      );
      const meals: Meal[] = [];
      qSnap.forEach((doc) => {
        const data = doc.data();
        meals.push({
          id: doc.id,
          ...data,
          date:
            data.date instanceof Timestamp
              ? data.date.toDate()
              : new Date(data.date),
        } as Meal);
      });
      setTodaysMeals(meals);
      const total = meals.reduce(
        (sum, m) => sum + (Number(m.calories) || 0),
        0
      );
      setCaloriesConsumed(total);
      setCaloriesRemaining(targetCalories - total);
      // Re-init listener
      setupFirestoreListener();
    } catch (err) {
      console.error("fetchTodaysMeals error:", err);
      setLoadingError("Failed to refresh data. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  }, [
    session?.user?.id,
    targetCalories,
    getTodayDateBounds,
    setupFirestoreListener,
  ]);

  // Load user profile for target calories and other settings
  const loadUserProfile = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const profile = await getUserProfileById(session.user.id);
      if (profile) {
        setUserProfile(profile);
        if (profile.targetCalories) {
          setTargetCalories(profile.targetCalories);
        }
      }
    } catch (err) {
      console.error("Error loading user profile:", err);
    }
  }, [session?.user?.id]);

  // On mount, check auth status, load profile, set up meals
  useEffect(() => {
    if (!mounted) return;
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && session?.user?.id) {
      loadUserProfile();
      setupFirestoreListener();
    }
  }, [
    status,
    router,
    session?.user?.id,
    mounted,
    loadUserProfile,
    setupFirestoreListener,
  ]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, []);

  // Called by ChatContainer (and also by the local logic) when a meal is logged
  const handleMealLogged = useCallback(() => {
    if (!toastShownRef.current) {
      toast.success("Meal logged successfully!");
      toastShownRef.current = true;
      toastTimeoutRef.current = setTimeout(() => {
        toastShownRef.current = false;
      }, 3000);
    }
  }, []);

  // Combine local mealLogged with prop
  const combinedHandleMealLogged = useCallback(() => {
    handleMealLogged();
    propOnMealLogged();
  }, [handleMealLogged, propOnMealLogged]);

  const handleWeightLogged = useCallback(() => {
    // Just show a toast or reload user profile
    toast.success("Weight updated successfully!");
    if (session?.user?.id) {
      loadUserProfile();
    }
  }, [loadUserProfile, session?.user?.id]);

  const handleRefresh = useCallback(() => {
    if (isRefreshing) return;
    fetchTodaysMeals().then(() => {
      toast.success("Meal data refreshed");
    });
  }, [isRefreshing, fetchTodaysMeals]);

  const handlePhoneCall = () => {
    setIsCalling(true);
    toast.info("Connecting to assistant...");
    setTimeout(() => {
      toast.success("Connected to Niblet voice assistant");
      setTimeout(() => {
        setIsCalling(false);
        toast.info("Call ended");
      }, 10000);
    }, 2000);
  };

  // 2) Use signOutFromAll instead of next-auth's signOut
  const handleLogout = async () => {
    toast.loading("Signing out...");

    try {
      // First clear all storage completely to ensure no chat data remains
      clearAllStorage();

      // Then perform the full signout process
      const success = await signOutFromAll();

      if (!success) {
        // Force navigate to home page if normal signout fails
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Error signing out:", error);
      // Force redirect to homepage on error
      window.location.href = "/";
    }
  };

  // Use the chat manager's personality change
  const handlePersonalityChange = (newPersonality: PersonalityKey) => {
    changePersonality(newPersonality);
  };

  // If still SSR or loading
  if (!mounted) return null;
  if (status === "loading" || isLoading) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <header className="py-3 border-b dark:border-gray-800 flex justify-between items-center">
          <div className="w-6"></div>
          <div className="text-2xl font-bold">
            niblet<span className="text-blue-400">.ai</span>
          </div>
          <div className="w-6"></div>
        </header>
        <div className="p-4">
          <Skeleton className="h-16 w-full mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 ">
      {/* Header */}
      <header className="py-3 px-4 border-b dark:border-gray-800 flex justify-between items-center">
        <HamburgerMenu
          currentPersonality={aiPersonality}
          onPersonalityChange={handlePersonalityChange}
        />
        <div className="text-2xl font-bold">
          niblet<span className="text-blue-400">.ai</span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setShowLogoutDialog(true)}
        >
          <Settings className="h-5 w-5" />
        </Button>
      </header>

      <div className="flex-1 flex flex-col p-4">
        <CaloriesStatusBar
          caloriesConsumed={caloriesConsumed}
          targetCalories={targetCalories}
          className="mx-4 my-3"
        />

        {loadingError && (
          <div className="bg-red-100 dark:bg-red-900 p-4 m-4 rounded-lg text-red-800 dark:text-red-200">
            <div className="font-medium">Error loading data</div>
            <div>{loadingError}</div>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                setLoadingError(null);
                setupFirestoreListener();
              }}
            >
              Retry
            </Button>
          </div>
        )}

        {chatError && (
          <div className="bg-red-100 dark:bg-red-900 p-4 m-4 rounded-lg text-red-800 dark:text-red-200">
            <div className="font-medium">Chat Error</div>
            <div>{chatError}</div>
          </div>
        )}

        <div className="mb-4 border rounded-lg shadow-sm overflow-hidden flex-1">
          {isChatInitializing ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p>Connecting to assistant...</p>
              </div>
            </div>
          ) : (
            <ChatContainer
              aiPersonality={aiPersonality}
              threadId={chatThreadId || undefined}
              assistantId={assistantId || undefined}
              onMealLogged={combinedHandleMealLogged}
              onWeightLogged={handleWeightLogged}
              isCalling={isCalling}
              onCall={handlePhoneCall}
            />
          )}
        </div>

        {/* Collapsible for today's meals */}
        <CollapsibleSection title="Today's Meals">
          <TodaysMeals
            meals={todaysMeals}
            isLoading={isRefreshing}
            onMealDeleted={handleMealLogged}
          />
          <div className="mt-2">
            <Button variant="outline" onClick={handleRefresh}>
              Refresh Meals
            </Button>
          </div>
        </CollapsibleSection>

        {/* Collapsible for progress chart */}
        <CollapsibleSection title="Progress Chart">
          <div className="relative">
            <CombinedWeightCalorieChart dateRange={dateRange} />
            <div className="mt-2 flex justify-center">
              <Tabs
                value={dateRange}
                onValueChange={(val) => setDateRange(val as any)}
              >
                <TabsList>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="month">Month</TabsTrigger>
                  <TabsTrigger value="3months">3 Months</TabsTrigger>
                  <TabsTrigger value="year">Year</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CollapsibleSection>
      </div>

      {/* Logout dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out of your account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>
              Log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
