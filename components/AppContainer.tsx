import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ChartsScreen from "./ChartsScreen";
import Dashboard from "./Dashboard";

type PersonalityKey = "best-friend" | "professional-coach" | "tough-love";

const App = () => {
  const [currentScreen, setCurrentScreen] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiPersonality, setAiPersonality] =
    useState<PersonalityKey>("best-friend");
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Handle touch gestures for swiping between screens
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX.current = e.changedTouches[0].clientX;
      handleSwipe();
    };

    const handleSwipe = () => {
      const SWIPE_THRESHOLD = 100;

      if (
        touchStartX.current !== null &&
        touchEndX.current !== null &&
        touchStartX.current - touchEndX.current > SWIPE_THRESHOLD
      ) {
        // Swiped left
        if (currentScreen === "dashboard") {
          setCurrentScreen("charts");
        }
      }

      if (
        touchStartX.current !== null &&
        touchEndX.current !== null &&
        touchEndX.current - touchStartX.current > SWIPE_THRESHOLD
      ) {
        // Swiped right
        if (currentScreen === "charts") {
          setCurrentScreen("dashboard");
        }
      }
    };

    document.addEventListener("touchstart", handleTouchStart);
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [currentScreen]);

  // Handle device orientation for landscape full-screen chart view
  useEffect(() => {
    const handleOrientationChange = () => {
      if (window.orientation === 90 || window.orientation === -90) {
        // Landscape mode
        if (currentScreen === "dashboard") {
          setCurrentScreen("charts");
        }
      }
    };

    // Check if window is defined (to avoid SSR issues)
    if (typeof window !== "undefined") {
      window.addEventListener("orientationchange", handleOrientationChange);

      return () => {
        window.removeEventListener(
          "orientationchange",
          handleOrientationChange
        );
      };
    }
  }, [currentScreen]);

  // Change AI personality
  const handlePersonalityChange = (personality: PersonalityKey) => {
    setAiPersonality(personality);
    setSidebarOpen(false);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Hamburger menu icon in top-left corner */}
      <button
        className="absolute top-4 left-4 z-50"
        onClick={() => setSidebarOpen(true)}
      >
        <Menu className="h-6 w-6 text-gray-800 dark:text-gray-200" />
      </button>

      {/* Sidebar menu */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            <h3 className="mb-2 font-medium">AI Personality</h3>
            <div className="space-y-2">
              <button
                className={`w-full text-left px-3 py-2 rounded-md ${
                  aiPersonality === "best-friend"
                    ? "bg-blue-100 dark:bg-blue-900"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
                onClick={() => handlePersonalityChange("best-friend")}
              >
                Best Friend
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Warm, casual, fun
                </p>
              </button>

              <button
                className={`w-full text-left px-3 py-2 rounded-md ${
                  aiPersonality === "professional-coach"
                    ? "bg-blue-100 dark:bg-blue-900"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
                onClick={() => handlePersonalityChange("professional-coach")}
              >
                Professional Coach
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Supportive, data-driven
                </p>
              </button>

              <button
                className={`w-full text-left px-3 py-2 rounded-md ${
                  aiPersonality === "tough-love"
                    ? "bg-blue-100 dark:bg-blue-900"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
                onClick={() => handlePersonalityChange("tough-love")}
              >
                Tough Love
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Strict, direct, motivational
                </p>
              </button>
            </div>

            <div className="mt-6 space-y-2">
              <button
                className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => {
                  setCurrentScreen("dashboard");
                  setSidebarOpen(false);
                }}
              >
                Dashboard
              </button>

              <button
                className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => {
                  setCurrentScreen("charts");
                  setSidebarOpen(false);
                }}
              >
                Charts
              </button>

              <div className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                Goals
              </div>

              <button className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                Export Data
              </button>

              <div className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                Info
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            className="mt-4 w-full"
            onClick={() => setSidebarOpen(false)}
          >
            Close Menu
          </Button>
        </SheetContent>
      </Sheet>

      {/* Main Screen Content */}
      <div className="w-full h-full">
        {currentScreen === "dashboard" && (
          <Dashboard aiPersonality={aiPersonality} />
        )}
        {currentScreen === "charts" && <ChartsScreen />}
      </div>

      {/* Navigation Dots */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center space-x-2">
        <button
          className={`w-2 h-2 rounded-full ${
            currentScreen === "dashboard"
              ? "bg-blue-500"
              : "bg-gray-300 dark:bg-gray-700"
          }`}
          onClick={() => setCurrentScreen("dashboard")}
        />
        <button
          className={`w-2 h-2 rounded-full ${
            currentScreen === "charts"
              ? "bg-blue-500"
              : "bg-gray-300 dark:bg-gray-700"
          }`}
          onClick={() => setCurrentScreen("charts")}
        />
      </div>
    </div>
  );
};

export default App;
