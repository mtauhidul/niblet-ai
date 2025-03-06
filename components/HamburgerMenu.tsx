// components/HamburgerMenu.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PersonalityKey } from "@/lib/assistantService";
import { createOrUpdateUserProfile } from "@/lib/firebase/models/user";
import {
  AlertCircle,
  Download,
  Goal,
  Home,
  Info,
  LogOut,
  Menu,
  Settings,
  Smile,
  Star,
  Thermometer,
  User,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";

interface HamburgerMenuProps {
  currentPersonality?: PersonalityKey;
  onPersonalityChange?: (personality: PersonalityKey) => void;
}

const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  currentPersonality = "best-friend",
  onPersonalityChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();

  const handlePersonalityChange = async (personality: PersonalityKey) => {
    if (onPersonalityChange) {
      onPersonalityChange(personality);
    }

    // Also update in database if user is logged in
    if (session?.user?.id) {
      try {
        await createOrUpdateUserProfile(session.user.id, {
          aiPersonality: personality,
        });
        toast.success(
          `AI personality changed to ${personality.replace("-", " ")}`
        );
      } catch (error) {
        console.error("Error updating AI personality:", error);
        toast.error("Failed to update AI personality");
      }
    }

    setIsOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      console.error("Error signing out:", error);
      // Force redirect to homepage on error
      window.location.href = "/";
    }
  };

  const exportData = () => {
    // This is a placeholder for data export functionality
    // In a real implementation, this would call an API to download user data
    toast.info("Exporting your data...");

    setTimeout(() => {
      try {
        // Create a dummy data object for demo purposes
        const exportData = {
          userData: {
            name: session?.user?.name,
            email: session?.user?.email,
            exportDate: new Date().toISOString(),
          },
          meals: [
            { name: "Breakfast", calories: 450, date: "2023-03-01" },
            { name: "Lunch", calories: 700, date: "2023-03-01" },
            { name: "Dinner", calories: 850, date: "2023-03-01" },
          ],
          weightLogs: [
            { weight: 180, date: "2023-02-15" },
            { weight: 178.5, date: "2023-02-22" },
            { weight: 177, date: "2023-03-01" },
          ],
        };

        // Convert to JSON and create download link
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUri =
          "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

        const exportFileDefaultName = "niblet-data.json";

        const linkElement = document.createElement("a");
        linkElement.setAttribute("href", dataUri);
        linkElement.setAttribute("download", exportFileDefaultName);
        linkElement.click();

        toast.success("Your data has been exported successfully!");
      } catch (error) {
        console.error("Error exporting data:", error);
        toast.error("Failed to export data. Please try again.");
      }
    }, 1500);

    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="p-0 h-10 w-10 rounded-full"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <SheetHeader className="text-left mb-6">
          <SheetTitle className="text-2xl">
            niblet<span className="text-blue-400">.ai</span>
          </SheetTitle>
          <SheetDescription>Meal tracking made simple</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 p-2">
          {/* Main Menu Items */}
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              className="justify-start"
              onClick={() => {
                router.push("/dashboard");
                setIsOpen(false);
              }}
            >
              <Home className="mr-2 h-5 w-5" />
              Dashboard
            </Button>

            <Button
              variant="ghost"
              className="justify-start"
              onClick={() => {
                router.push("/charts");
                setIsOpen(false);
              }}
            >
              <Thermometer className="mr-2 h-5 w-5" />
              Progress Charts
            </Button>

            <Button
              variant="ghost"
              className="justify-start"
              onClick={() => {
                router.push("/goals");
                setIsOpen(false);
              }}
            >
              <Goal className="mr-2 h-5 w-5" />
              Goals
            </Button>

            <Button
              variant="ghost"
              className="justify-start"
              onClick={exportData}
            >
              <Download className="mr-2 h-5 w-5" />
              Export Data
            </Button>
          </div>

          {/* AI Personality Selection */}
          <div className="py-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="mb-2 font-medium flex items-center">
              <Smile className="mr-2 h-5 w-5" />
              AI Personality
            </h3>
            <div className="space-y-2 pl-7">
              <button
                className={`w-full text-left px-3 py-2 rounded-md ${
                  currentPersonality === "best-friend"
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
                  currentPersonality === "professional-coach"
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
                  currentPersonality === "tough-love"
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
          </div>

          {/* Info Submenu */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <Collapsible open={infoOpen} onOpenChange={setInfoOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="justify-start w-full">
                  <Info className="mr-2 h-5 w-5" />
                  Info
                  <svg
                    className={`ml-auto h-4 w-4 transition-transform ${
                      infoOpen ? "rotate-180" : ""
                    }`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-7 space-y-1">
                <Button
                  variant="ghost"
                  className="justify-start w-full"
                  onClick={() => {
                    router.push("/profile");
                    setIsOpen(false);
                  }}
                >
                  <User className="mr-2 h-5 w-5" />
                  Profile
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start w-full"
                  onClick={() => {
                    router.push("/goals");
                    setIsOpen(false);
                  }}
                >
                  <Star className="mr-2 h-5 w-5" />
                  Goals
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start w-full"
                  onClick={() => {
                    router.push("/settings");
                    setIsOpen(false);
                  }}
                >
                  <Settings className="mr-2 h-5 w-5" />
                  Preferences
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start w-full"
                  onClick={() => {
                    router.push("/account");
                    setIsOpen(false);
                  }}
                >
                  <AlertCircle className="mr-2 h-5 w-5" />
                  Account
                </Button>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between py-4 border-t border-gray-200 dark:border-gray-700">
            <Label htmlFor="dark-mode" className="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2"
              >
                <circle cx="12" cy="12" r="4"></circle>
                <path d="M12 2v2"></path>
                <path d="M12 20v2"></path>
                <path d="m4.93 4.93 1.41 1.41"></path>
                <path d="m17.66 17.66 1.41 1.41"></path>
                <path d="M2 12h2"></path>
                <path d="M20 12h2"></path>
                <path d="m6.34 17.66-1.41 1.41"></path>
                <path d="m19.07 4.93-1.41 1.41"></path>
              </svg>
              Dark Mode
            </Label>
            <Switch
              id="dark-mode"
              onCheckedChange={(checked) => {
                document.documentElement.classList.toggle("dark", checked);
                if (typeof window !== "undefined") {
                  localStorage.setItem("darkMode", checked ? "true" : "false");
                }
              }}
              defaultChecked={
                typeof window !== "undefined" &&
                document.documentElement.classList.contains("dark")
              }
            />
          </div>

          {/* Sign Out Button */}
          <Button
            variant="outline"
            className="mt-4 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default HamburgerMenu;
