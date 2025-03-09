// Modified version of app/profile/page.tsx with DeleteAccountSection
"use client";

import DeleteAccountSection from "@/components/DeleteAccountSection";
import HamburgerMenu from "@/components/HamburgerMenu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import UserAvatar from "@/components/UserAvatar";
import { ArrowLeft, Save } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    age: "",
    gender: "",
    height: "",
    dietaryPreferences: [] as string[],
    allergies: [] as string[],
    aiPersonality: "best-friend",
    receiveNotifications: true,
    preferredMealFrequency: "3",
  });

  // Set mounted state to prevent hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (mounted && status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router, mounted]);

  // Initialize form with session data and fetch profile
  useEffect(() => {
    if (mounted && status === "authenticated" && session?.user) {
      setProfileData((prev) => ({
        ...prev,
        name: session.user?.name || "",
        email: session.user?.email || "",
      }));
      fetchUserProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session, mounted]);

  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/user/profile");
      if (response.ok) {
        const userProfile = await response.json();

        // Combine session data with user profile
        setProfileData((prev) => ({
          ...prev,
          name: session?.user?.name || prev.name,
          email: session?.user?.email || prev.email,
          age: userProfile.age?.toString() || "",
          gender: userProfile.gender || "",
          height: userProfile.height?.toString() || "",
          dietaryPreferences: userProfile.dietaryPreferences || [],
          allergies: userProfile.allergies || [],
          aiPersonality: userProfile.aiPersonality || "best-friend",
          receiveNotifications:
            userProfile.receiveNotifications !== undefined
              ? userProfile.receiveNotifications
              : true,
          preferredMealFrequency: userProfile.preferredMealFrequency || "3",
        }));
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      toast.error("Failed to load profile data");
    }
  }, [session?.user?.name, session?.user?.email]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string | string[]) => {
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const saveProfile = async () => {
    setIsSaving(true);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          age: profileData.age ? parseInt(profileData.age) : undefined,
          gender: profileData.gender,
          height: profileData.height
            ? parseFloat(profileData.height)
            : undefined,
          dietaryPreferences: profileData.dietaryPreferences,
          allergies: profileData.allergies,
          aiPersonality: profileData.aiPersonality,
          receiveNotifications: profileData.receiveNotifications,
          preferredMealFrequency: profileData.preferredMealFrequency,
        }),
      });

      if (response.ok) {
        toast.success("Profile updated successfully");
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle hydration properly - don't render until mounted
  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header - Matching exactly the image */}
      <header className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <HamburgerMenu />
        <div className="text-2xl font-bold">
          niblet<span className="text-blue-400">.ai</span>
        </div>
        <div className="w-6"></div> {/* Empty div for balanced spacing */}
      </header>

      <div className="max-w-3xl mx-auto p-4">
        {/* Header with back button */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard")}
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Profile</h1>
        </div>

        {/* User Avatar Section */}
        <div className="mb-6 flex flex-col items-center">
          <UserAvatar size="lg" className="mb-3" />
          <p className="text-lg font-medium">{profileData.name || "User"}</p>
          <p className="text-sm text-gray-500">{profileData.email}</p>
        </div>

        {/* Personal Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name (from account)</Label>
                <div className="h-9 px-3 py-1 border border-input rounded-md bg-gray-100 dark:bg-gray-800 flex items-center">
                  {profileData.name || "Name not provided"}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (from account)</Label>
                <div className="h-9 px-3 py-1 border border-input rounded-md bg-gray-100 dark:bg-gray-800 flex items-center">
                  {profileData.email || "Email not provided"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  name="age"
                  type="number"
                  value={profileData.age}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={profileData.gender}
                  onValueChange={(value) => handleSelectChange("gender", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non-binary">Non-binary</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="height">Height (inches)</Label>
                <Input
                  id="height"
                  name="height"
                  type="number"
                  value={profileData.height}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dietary Preferences */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Dietary Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Diet Type</Label>
              <Select
                value={profileData.dietaryPreferences?.[0] || ""}
                onValueChange={(value) =>
                  handleSelectChange("dietaryPreferences", [value])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select diet type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="omnivore">Omnivore</SelectItem>
                  <SelectItem value="vegetarian">Vegetarian</SelectItem>
                  <SelectItem value="vegan">Vegan</SelectItem>
                  <SelectItem value="pescatarian">Pescatarian</SelectItem>
                  <SelectItem value="keto">Keto</SelectItem>
                  <SelectItem value="paleo">Paleo</SelectItem>
                  <SelectItem value="mediterranean">Mediterranean</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergies">Food Allergies</Label>
              <Input
                id="allergies"
                name="allergies"
                placeholder="e.g., peanuts, shellfish, dairy (comma separated)"
                value={profileData.allergies?.join(", ") || ""}
                onChange={(e) => {
                  const allergyArray = e.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean);
                  setProfileData((prev) => ({
                    ...prev,
                    allergies: allergyArray,
                  }));
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* App Preferences */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>App Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="aiPersonality">AI Personality</Label>
              <Select
                value={profileData.aiPersonality}
                onValueChange={(value) =>
                  handleSelectChange("aiPersonality", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select personality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="best-friend">
                    Best Friend (Warm & Encouraging)
                  </SelectItem>
                  <SelectItem value="professional-coach">
                    Professional Coach (Data-Driven)
                  </SelectItem>
                  <SelectItem value="tough-love">
                    Tough Love (Direct & Challenging)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferredMealFrequency">
                Preferred Meal Frequency
              </Label>
              <Select
                value={profileData.preferredMealFrequency}
                onValueChange={(value) =>
                  handleSelectChange("preferredMealFrequency", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select meal frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 meals per day</SelectItem>
                  <SelectItem value="5">5 meals per day</SelectItem>
                  <SelectItem value="6">6 meals per day</SelectItem>
                  <SelectItem value="custom">Custom meal schedule</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                This helps Niblet provide better meal suggestions and reminders
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="receiveNotifications"
                checked={profileData.receiveNotifications}
                onChange={(e) => {
                  setProfileData((prev) => ({
                    ...prev,
                    receiveNotifications: e.target.checked,
                  }));
                }}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label
                htmlFor="receiveNotifications"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Receive meal reminders and notifications
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end mb-10">
          <Button
            onClick={saveProfile}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {/* Delete Account Section */}
        <div className="mt-10">
          <DeleteAccountSection />
        </div>
      </div>
    </div>
  );
}
