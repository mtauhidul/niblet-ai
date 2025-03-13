// Updated HamburgerMenu.tsx with simplified structure

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { signOutFromAll } from "@/lib/auth/authUtils";
import { clearAllStorage } from "@/lib/ChatHistoryManager";
import {
  Download,
  Home,
  LogOut,
  Menu,
  Moon,
  Shield,
  Sun,
  User,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { JSX, useEffect, useState } from "react";
import { toast } from "sonner";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";

interface HamburgerMenuProps {
  className?: string;
}

const HamburgerMenu: React.FC<HamburgerMenuProps> = ({ className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();

  // Initialize dark mode from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedDarkMode = localStorage.getItem("darkMode") === "true";
      setIsDarkMode(savedDarkMode);
      document.documentElement.classList.toggle("dark", savedDarkMode);
    }
  }, []);

  const toggleDarkMode = (checked: boolean) => {
    setIsDarkMode(checked);
    document.documentElement.classList.toggle("dark", checked);
    if (typeof window !== "undefined") {
      localStorage.setItem("darkMode", checked ? "true" : "false");
    }
  };

  // Comprehensive sign out function
  const handleSignOut = async () => {
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

  const exportData = () => {
    toast.info("Preparing your data export...");

    setTimeout(() => {
      try {
        // Create a sample data object for demo
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

        // Convert to JSON and trigger download
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
    }, 1000);

    setIsOpen(false);
  };

  // Simplified menu items according to requirements
  interface MenuItem {
    label: string;
    icon: JSX.Element;
    onClick: () => void | Promise<void>;
    className?: string;
    hidden?: boolean;
  }

  const menuItems: MenuItem[] = [
    {
      label: "Dashboard",
      icon: <Home className="h-5 w-5" />,
      onClick: () => {
        router.push("/dashboard");
        setIsOpen(false);
      },
    },
    {
      label: "Profile",
      icon: <User className="h-5 w-5" />,
      onClick: () => {
        router.push("/profile");
        setIsOpen(false);
      },
    },
    {
      label: "Export Data",
      icon: <Download className="h-5 w-5" />,
      onClick: exportData,
    },
    // Only show Admin option for admin users (add logic to determine admin status)
    {
      label: "Admin",
      icon: <Shield className="h-5 w-5" />,
      onClick: () => {
        router.push("/admin");
        setIsOpen(false);
      },
      // Uncomment this when admin check is implemented
      // hidden: !isAdmin,
    },
    // Add logout here in the menu
    {
      label: "Sign Out",
      icon: <LogOut className="h-5 w-5" />,
      onClick: handleSignOut,
      className: "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20",
    },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="p-0 h-10 w-10 rounded-full focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary cursor-pointer"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="w-[85vw] max-w-xs sm:max-w-sm h-[100dvh] flex flex-col overflow-hidden p-4"
      >
        <SheetHeader className="text-left mb-3 p-0">
          <SheetTitle className="text-xl flex items-center">
            <div className="bg-blue-100 dark:bg-blue-900 p-1.5 rounded-full mr-2">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 19h16" />
                <path d="M4 15h16" />
                <path d="M4 11h16" />
                <path d="M4 7h16" />
              </svg>
            </div>
            niblet<span className="text-blue-400">.ai</span>
          </SheetTitle>
          <SheetDescription className="text-sm">
            Meal tracking made simple
          </SheetDescription>
        </SheetHeader>

        {/* Main Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Main Navigation */}
          <div className="mb-4">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Navigation
            </div>
            <nav>
              <ul className="space-y-0.5">
                {menuItems.map(
                  (item, index) =>
                    !item.hidden && (
                      <li key={index}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`w-full justify-start text-left py-1.5 h-auto group ${
                            item.className || ""
                          }`}
                          onClick={item.onClick}
                        >
                          <span className="flex items-center">
                            <span className="mr-2 text-gray-500 dark:text-gray-400 group-hover:text-primary">
                              {item.icon}
                            </span>
                            <span className="text-sm">{item.label}</span>
                          </span>
                        </Button>
                      </li>
                    )
                )}
              </ul>
            </nav>
          </div>
        </div>

        {/* Footer Section */}
        <div className="mt-auto border-t dark:border-gray-800 pt-4 pb-1 space-y-3">
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between">
            <Label
              htmlFor="dark-mode"
              className="flex items-center cursor-pointer"
            >
              {isDarkMode ? (
                <Moon className="h-4 w-4 mr-2" />
              ) : (
                <Sun className="h-4 w-4 mr-2" />
              )}
              {isDarkMode ? "Dark Mode" : "Light Mode"}
            </Label>
            <Switch
              id="dark-mode"
              checked={isDarkMode}
              onCheckedChange={toggleDarkMode}
            />
          </div>

          {/* User Info */}
          {session?.user && (
            <div className="py-2 bg-gray-100 dark:bg-gray-800 rounded-md">
              <div className="flex items-center">
                <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-1 mr-2">
                  {session.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      className="h-5 w-5 rounded-full"
                    />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="font-medium text-sm truncate">
                    {session.user.name || "User"}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {session.user.email}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default HamburgerMenu;
