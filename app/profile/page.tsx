// app/profile/page.tsx
"use client";

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
import { ArrowLeft, Save } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    age: "",
    gender: "",
    currentWeight: "",
    targetWeight: "",
    height: "",
    activityLevel: "",
    dietaryPreferences: [] as string[],
    allergies: [] as string[],
    goalType: "",
    targetCalories: "",
    targetProtein: "",
    targetCarbs: "",
    targetFat: "",
    aiPersonality: "best-friend",
  });

  useEffect(() => {
    // If not authenticated, redirect to login
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchUserProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, router]);

  const fetchUserProfile = async () => {
    setIsLoading(true);
    try {
      // Get user profile
      const response = await fetch("/api/user/profile");
      if (response.ok) {
        const userProfile = await response.json();

        // Set name and email from session
        setProfileData({
          name: session?.user?.name || "",
          email: session?.user?.email || "",
          age: userProfile.age?.toString() || "",
          gender: userProfile.gender || "",
          currentWeight: userProfile.currentWeight?.toString() || "",
          targetWeight: userProfile.targetWeight?.toString() || "",
          height: userProfile.height?.toString() || "",
          activityLevel: userProfile.activityLevel || "",
          dietaryPreferences: userProfile.dietaryPreferences || [],
          allergies: userProfile.allergies || [],
          goalType: userProfile.goalType || "",
          targetCalories: userProfile.targetCalories?.toString() || "",
          targetProtein: userProfile.targetProtein?.toString() || "",
          targetCarbs: userProfile.targetCarbs?.toString() || "",
          targetFat: userProfile.targetFat?.toString() || "",
          aiPersonality: userProfile.aiPersonality || "best-friend",
        });
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setErrorMessage("Failed to load profile data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const saveProfile = async () => {
    setIsSaving(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          age: profileData.age ? parseInt(profileData.age) : undefined,
          gender: profileData.gender,
          currentWeight: profileData.currentWeight
            ? parseFloat(profileData.currentWeight)
            : undefined,
          targetWeight: profileData.targetWeight
            ? parseFloat(profileData.targetWeight)
            : undefined,
          height: profileData.height
            ? parseFloat(profileData.height)
            : undefined,
          activityLevel: profileData.activityLevel,
          dietaryPreferences: profileData.dietaryPreferences,
          allergies: profileData.allergies,
          goalType: profileData.goalType,
          targetCalories: profileData.targetCalories
            ? parseInt(profileData.targetCalories)
            : undefined,
          targetProtein: profileData.targetProtein
            ? parseInt(profileData.targetProtein)
            : undefined,
          targetCarbs: profileData.targetCarbs
            ? parseInt(profileData.targetCarbs)
            : undefined,
          targetFat: profileData.targetFat
            ? parseInt(profileData.targetFat)
            : undefined,
          aiPersonality: profileData.aiPersonality,
        }),
      });

      if (response.ok) {
        setSuccessMessage("Profile updated successfully!");
      } else {
        const error = await response.json();
        setErrorMessage(
          error.message || "Failed to update profile. Please try again."
        );
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center">
          <Button
            variant="ghost"
            className="mr-2"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Your Profile</h1>
        </div>

        {/* Personal Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={profileData.name}
                  onChange={handleInputChange}
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  value={profileData.email}
                  onChange={handleInputChange}
                  disabled
                />
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

        {/* Fitness Goals */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Fitness Goals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currentWeight">Current Weight (lbs)</Label>
                <Input
                  id="currentWeight"
                  name="currentWeight"
                  type="number"
                  value={profileData.currentWeight}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetWeight">Target Weight (lbs)</Label>
                <Input
                  id="targetWeight"
                  name="targetWeight"
                  type="number"
                  value={profileData.targetWeight}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="goalType">Goal Type</Label>
                <Select
                  value={profileData.goalType}
                  onValueChange={(value) =>
                    handleSelectChange("goalType", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select goal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Weight Loss">Weight Loss</SelectItem>
                    <SelectItem value="Weight Maintenance">
                      Weight Maintenance
                    </SelectItem>
                    <SelectItem value="Muscle Gain">Muscle Gain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="activityLevel">Activity Level</Label>
                <Select
                  value={profileData.activityLevel}
                  onValueChange={(value) =>
                    handleSelectChange("activityLevel", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select activity level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sedentary">Sedentary</SelectItem>
                    <SelectItem value="Lightly Active">
                      Lightly Active
                    </SelectItem>
                    <SelectItem value="Moderately Active">
                      Moderately Active
                    </SelectItem>
                    <SelectItem value="Very Active">Very Active</SelectItem>
                    <SelectItem value="Extremely Active">
                      Extremely Active
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Nutrition Targets */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Nutrition Targets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetCalories">Daily Calories</Label>
                <Input
                  id="targetCalories"
                  name="targetCalories"
                  type="number"
                  value={profileData.targetCalories}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetProtein">Protein (g)</Label>
                <Input
                  id="targetProtein"
                  name="targetProtein"
                  type="number"
                  value={profileData.targetProtein}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetCarbs">Carbs (g)</Label>
                <Input
                  id="targetCarbs"
                  name="targetCarbs"
                  type="number"
                  value={profileData.targetCarbs}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetFat">Fat (g)</Label>
                <Input
                  id="targetFat"
                  name="targetFat"
                  type="number"
                  value={profileData.targetFat}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assistant Preferences */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Assistant Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-md">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-md">
            {errorMessage}
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={saveProfile}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
