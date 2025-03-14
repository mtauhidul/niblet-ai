// components/AdminPanel.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAppConfig } from "@/context/AppConfigContext";
import { AIPersonality, AISettings, Notification } from "@/lib/configManager";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Plus,
  Save,
  Trash,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import HamburgerMenu from "./HamburgerMenu";

type TabValue = "ai-settings" | "notifications";

type Day =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

type NewNotification = Omit<Notification, "id">;

const AdminPanel: React.FC = () => {
  const router = useRouter();
  const { aiSettings, updateAISettings, notifications, updateNotifications } =
    useAppConfig();

  const [activeTab, setActiveTab] = useState<TabValue>("ai-settings");
  const [editingPersonality, setEditingPersonality] = useState<string | null>(
    null
  );
  const [newNotification, setNewNotification] = useState<NewNotification>({
    title: "",
    message: "",
    triggerTime: "12:00",
    daysActive: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    isActive: true,
  });
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [savedMessage, setSavedMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [newPersonalityName, setNewPersonalityName] = useState<string>("");
  const [newPersonalityKey, setNewPersonalityKey] = useState<string>("");

  const daysOfWeek: Day[] = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  const isAdmin = true; // Hardcoded for now

  // Redirect non-admin users
  useEffect(() => {
    if (!isAdmin) {
      router.push("/dashboard");
      toast.error("You don't have permission to access the admin panel");
    }
  }, [isAdmin, router]);

  // Handle personality edit
  const handlePersonalityChange = (
    personality: string,
    field: keyof AIPersonality,
    value: string | number | boolean
  ): void => {
    const updatedSettings: AISettings = {
      ...aiSettings,
      personalities: {
        ...aiSettings.personalities,
        [personality]: {
          ...aiSettings.personalities[personality],
          [field]: value,
        },
      },
    };

    updateAISettings(updatedSettings);
  };

  // Generate a key from the name
  const generateKeyFromName = (): void => {
    if (!newPersonalityName) return;

    const key = newPersonalityName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    setNewPersonalityKey(key);
  };

  // Add a new personality
  const addNewPersonality = (): void => {
    if (!newPersonalityKey || !newPersonalityName) {
      setErrorMessage("Personality key and name are required");
      return;
    }

    if (aiSettings.personalities[newPersonalityKey]) {
      setErrorMessage("Personality key already exists");
      return;
    }

    const updatedSettings: AISettings = {
      ...aiSettings,
      personalities: {
        ...aiSettings.personalities,
        [newPersonalityKey]: {
          name: newPersonalityName,
          instructions:
            "You are Niblet, a nutrition assistant. Provide guidance and support for the user's health goals.",
          temperature: 0.5,
          isActive: true,
        },
      },
    };

    updateAISettings(updatedSettings);
    setNewPersonalityKey("");
    setNewPersonalityName("");
    setIsCreatingNew(false);
    setEditingPersonality(newPersonalityKey); // Start editing the new personality
    toast.success("New personality created successfully");
  };

  // Save AI settings
  const saveAISettings = (): void => {
    setIsLoading(true);
    setSavedMessage("");
    setErrorMessage("");

    try {
      // Save will happen through the context provider
      setSavedMessage("AI settings saved successfully!");
      toast.success("AI settings saved successfully!");
    } catch (error) {
      console.error("Error saving AI settings:", error);
      setErrorMessage("Failed to save AI settings");
      toast.error("Failed to save AI settings");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a personality
  const deletePersonality = (key: string): void => {
    if (Object.keys(aiSettings.personalities).length <= 1) {
      setErrorMessage("Cannot delete the last personality");
      return;
    }

    if (key === aiSettings.defaultPersonality) {
      setErrorMessage(
        "Cannot delete the default personality. Please change the default first."
      );
      return;
    }

    const { [key]: _, ...remainingPersonalities } = aiSettings.personalities;

    const updatedSettings: AISettings = {
      ...aiSettings,
      personalities: remainingPersonalities,
    };

    updateAISettings(updatedSettings);

    if (editingPersonality === key) {
      setEditingPersonality(null);
    }

    toast.success("Personality deleted successfully");
  };

  // Handle notification toggle
  const toggleNotification = (id: number): void => {
    const updatedNotifications = notifications.map((notif) =>
      notif.id === id ? { ...notif, isActive: !notif.isActive } : notif
    );

    updateNotifications(updatedNotifications);
  };

  // Add new notification
  const addNotification = (): void => {
    if (!newNotification.title || !newNotification.message) {
      toast.error("Title and message are required!");
      return;
    }

    const newId = Math.max(...notifications.map((n) => n.id), 0) + 1;

    const updatedNotifications = [
      ...notifications,
      {
        ...newNotification,
        id: newId,
      },
    ];

    updateNotifications(updatedNotifications);
    toast.success("Notification added successfully!");

    // Reset form
    setNewNotification({
      title: "",
      message: "",
      triggerTime: "12:00",
      daysActive: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      isActive: true,
    });
  };

  // Delete notification
  const deleteNotification = (id: number): void => {
    const updatedNotifications = notifications.filter(
      (notif) => notif.id !== id
    );

    updateNotifications(updatedNotifications);
    toast.success("Notification deleted successfully!");
  };

  // Toggle day selection for notifications
  const toggleDay = (day: Day): void => {
    setNewNotification((prev) => {
      if (prev.daysActive.includes(day)) {
        return {
          ...prev,
          daysActive: prev.daysActive.filter((d) => d !== day),
        };
      } else {
        return {
          ...prev,
          daysActive: [...prev.daysActive, day],
        };
      }
    });
  };

  // Save notification settings
  const saveNotificationSettings = (): void => {
    setIsLoading(true);

    try {
      // Save happens through the context provider
      toast.success("Notification settings saved successfully!");
    } catch (error) {
      console.error("Error saving notification settings:", error);
      toast.error("Failed to save notification settings");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin) {
    return null; // Don't render anything if not admin
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-2 md:p-4 lg:p-6 max-w-[600px] mx-auto">
      {/* Header - Matching exactly the image */}
      <header className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <HamburgerMenu />
        <div className="text-2xl font-bold">
          niblet<span className="text-blue-400">.ai</span>
        </div>
        <div className="w-6"></div> {/* Empty div for balanced spacing */}
      </header>

      {/* Header with back button */}
      <div className="flex items-center mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard")}
          className="mr-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Admin</h1>
      </div>

      <Tabs
        defaultValue="ai-settings"
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabValue)}
      >
        <TabsList className="mb-6 w-full max-w-md">
          <TabsTrigger value="ai-settings" className="w-1/2">
            AI Settings
          </TabsTrigger>
          <TabsTrigger value="notifications" className="w-1/2">
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* AI Settings Tab */}
        <TabsContent value="ai-settings" className="space-y-6">
          {/* General AI Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>General AI Instructions</CardTitle>
              <CardDescription>
                Base instructions provided to all AI personalities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={4}
                value={aiSettings.generalInstructions}
                onChange={(e) => {
                  const updatedSettings = {
                    ...aiSettings,
                    generalInstructions: e.target.value,
                  };
                  updateAISettings(updatedSettings);
                }}
                className="mb-4"
              />

              <div className="flex items-center space-x-2 mb-6">
                <Label htmlFor="default-personality" className="min-w-fit">
                  Default Personality:
                </Label>
                <Select
                  value={aiSettings.defaultPersonality}
                  onValueChange={(value) => {
                    const updatedSettings = {
                      ...aiSettings,
                      defaultPersonality: value,
                    };
                    updateAISettings(updatedSettings);
                  }}
                >
                  <SelectTrigger id="default-personality" className="w-full">
                    <SelectValue placeholder="Select personality" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(aiSettings.personalities).map((key) => (
                      <SelectItem key={key} value={key}>
                        {aiSettings.personalities[key].name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* AI Personalities */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div>
                  <CardTitle>AI Personalities</CardTitle>
                  <CardDescription>
                    Configure different personalities for the AI assistant
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreatingNew(true)}
                  disabled={isCreatingNew}
                  className="whitespace-nowrap"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Personality
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* New Personality Form */}
              {isCreatingNew && (
                <div className="mb-6 border p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <h3 className="text-lg font-medium mb-4">
                    Create New Personality
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="new-personality-name">Display Name</Label>
                      <Input
                        id="new-personality-name"
                        value={newPersonalityName}
                        onChange={(e) => {
                          setNewPersonalityName(e.target.value);
                          // Auto-generate key as they type
                          if (
                            !newPersonalityKey ||
                            newPersonalityKey ===
                              newPersonalityName
                                .toLowerCase()
                                .replace(/\s+/g, "-")
                                .replace(/[^a-z0-9-]/g, "")
                          ) {
                            generateKeyFromName();
                          }
                        }}
                        placeholder="E.g., Fitness Expert"
                        className="mb-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="new-personality-key">
                        Personality Key (no spaces, lowercase)
                      </Label>
                      <Input
                        id="new-personality-key"
                        value={newPersonalityKey}
                        onChange={(e) =>
                          setNewPersonalityKey(
                            e.target.value
                              .toLowerCase()
                              .replace(/\s+/g, "-")
                              .replace(/[^a-z0-9-]/g, "")
                          )
                        }
                        placeholder="E.g., fitness-expert"
                        className="mb-2"
                      />
                      <p className="text-xs text-gray-500">
                        This is used internally as an identifier and can't be
                        changed later.
                      </p>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsCreatingNew(false);
                          setNewPersonalityName("");
                          setNewPersonalityKey("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={addNewPersonality}
                        disabled={!newPersonalityKey || !newPersonalityName}
                      >
                        Create Personality
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Personality Cards */}
              <div className="space-y-4">
                {Object.keys(aiSettings.personalities).map((personalityKey) => (
                  <div key={personalityKey} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                      <div>
                        <h3 className="text-lg font-medium">
                          {aiSettings.personalities[personalityKey].name}
                        </h3>

                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {personalityKey === aiSettings.defaultPersonality &&
                            "(Default)"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`${personalityKey}-active`}
                            checked={
                              aiSettings.personalities[personalityKey].isActive
                            }
                            onCheckedChange={(checked) => {
                              handlePersonalityChange(
                                personalityKey,
                                "isActive",
                                checked
                              );
                            }}
                          />
                          <Label
                            htmlFor={`${personalityKey}-active`}
                            className="whitespace-nowrap"
                          >
                            Active
                          </Label>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setEditingPersonality(
                                editingPersonality === personalityKey
                                  ? null
                                  : personalityKey
                              )
                            }
                          >
                            {editingPersonality === personalityKey ? (
                              <ChevronUp className="h-4 w-4 mr-1" />
                            ) : (
                              <ChevronDown className="h-4 w-4 mr-1" />
                            )}
                            {editingPersonality === personalityKey
                              ? "Hide"
                              : "Edit"}
                          </Button>

                          {/* Only show delete button for non-default personalities */}
                          {personalityKey !== aiSettings.defaultPersonality && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
                              onClick={() => deletePersonality(personalityKey)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded editing UI */}
                    {editingPersonality === personalityKey && (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor={`${personalityKey}-name`}>
                            Display Name
                          </Label>
                          <Input
                            id={`${personalityKey}-name`}
                            value={
                              aiSettings.personalities[personalityKey].name
                            }
                            onChange={(e) =>
                              handlePersonalityChange(
                                personalityKey,
                                "name",
                                e.target.value
                              )
                            }
                            className="mb-2"
                          />
                        </div>

                        <div>
                          <Label htmlFor={`${personalityKey}-instructions`}>
                            Instructions
                          </Label>
                          <Textarea
                            id={`${personalityKey}-instructions`}
                            value={
                              aiSettings.personalities[personalityKey]
                                .instructions
                            }
                            onChange={(e) =>
                              handlePersonalityChange(
                                personalityKey,
                                "instructions",
                                e.target.value
                              )
                            }
                            rows={6}
                            className="mb-2"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between mb-2">
                            <Label htmlFor={`${personalityKey}-temperature`}>
                              Temperature:{" "}
                              {aiSettings.personalities[
                                personalityKey
                              ].temperature.toFixed(2)}
                            </Label>
                          </div>
                          <Slider
                            id={`${personalityKey}-temperature`}
                            value={[
                              aiSettings.personalities[personalityKey]
                                .temperature * 100,
                            ]}
                            min={0}
                            max={100}
                            step={1}
                            onValueChange={(value) =>
                              handlePersonalityChange(
                                personalityKey,
                                "temperature",
                                value[0] / 100
                              )
                            }
                            className="mb-4"
                          />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>More Predictable</span>
                            <span>More Creative</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Status Messages */}
              {errorMessage && (
                <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-md text-red-800 dark:text-red-200 my-4">
                  {errorMessage}
                </div>
              )}

              {savedMessage && (
                <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-md text-green-800 dark:text-green-200 my-4">
                  {savedMessage}
                </div>
              )}

              {/* Save Button */}
              <Button
                onClick={saveAISettings}
                disabled={isLoading}
                className="mt-4 w-full md:w-auto"
              >
                {isLoading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save AI Settings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          {/* Notification Management */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Management</CardTitle>
              <CardDescription>
                Configure automatic notifications and reminders sent to users
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-hidden">
              {/* Mobile table view */}
              <div className="md:hidden space-y-4">
                {notifications.map((notification) => (
                  <div key={notification.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{notification.title}</span>
                      <Switch
                        checked={notification.isActive}
                        onCheckedChange={() =>
                          toggleNotification(notification.id)
                        }
                      />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                      {notification.message}
                    </p>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Time: {notification.triggerTime}</span>
                      <span>
                        Days:{" "}
                        {notification.daysActive
                          .map((day) => day.substring(0, 3))
                          .join(", ")}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteNotification(notification.id)}
                      className="mt-2 w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                ))}
              </div>

              {/* Desktop table view */}
              <div className="hidden md:block">
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableCaption>
                      List of configured notifications
                    </TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notifications.map((notification) => (
                        <TableRow key={notification.id}>
                          <TableCell className="font-medium">
                            {notification.title}
                          </TableCell>
                          <TableCell>{notification.message}</TableCell>
                          <TableCell>{notification.triggerTime}</TableCell>
                          <TableCell>
                            {notification.daysActive
                              .map((day) => day.substring(0, 3))
                              .join(", ")}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={notification.isActive}
                              onCheckedChange={() =>
                                toggleNotification(notification.id)
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                deleteNotification(notification.id)
                              }
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <Button onClick={saveNotificationSettings} className="mt-4">
                  <Save className="mr-2 h-4 w-4" />
                  Save Notification Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Add New Notification */}
          <Card>
            <CardHeader>
              <CardTitle>Add New Notification</CardTitle>
              <CardDescription>
                Create a new automatic notification or reminder
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="notification-title">Title</Label>
                    <Input
                      id="notification-title"
                      value={newNotification.title}
                      onChange={(e) =>
                        setNewNotification((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      placeholder="Meal Reminder"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notification-time">Trigger Time</Label>
                    <Input
                      id="notification-time"
                      type="time"
                      value={newNotification.triggerTime}
                      onChange={(e) =>
                        setNewNotification((prev) => ({
                          ...prev,
                          triggerTime: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notification-message">Message</Label>
                  <Textarea
                    id="notification-message"
                    value={newNotification.message}
                    onChange={(e) =>
                      setNewNotification((prev) => ({
                        ...prev,
                        message: e.target.value,
                      }))
                    }
                    placeholder="Time to log your meal! What did you have?"
                    rows={3}
                  />
                </div>

                <div>
                  <Label className="mb-2 block">Active Days</Label>
                  <div className="flex flex-wrap gap-2">
                    {daysOfWeek.map((day) => (
                      <Button
                        key={day}
                        type="button"
                        variant={
                          newNotification.daysActive.includes(day)
                            ? "default"
                            : "outline"
                        }
                        onClick={() => toggleDay(day)}
                        className="capitalize"
                        size="sm"
                      >
                        {day.substring(0, 3)}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="notification-active"
                    checked={newNotification.isActive}
                    onCheckedChange={(checked) =>
                      setNewNotification((prev) => ({
                        ...prev,
                        isActive: checked,
                      }))
                    }
                  />
                  <Label htmlFor="notification-active">Active</Label>
                </div>

                <Button
                  onClick={addNotification}
                  className="w-full"
                  disabled={!newNotification.title || !newNotification.message}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Notification
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Mobile save button (only visible on mobile) */}
          <div className="md:hidden">
            <Button onClick={saveNotificationSettings} className="w-full">
              <Save className="mr-2 h-4 w-4" />
              Save Notification Settings
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
