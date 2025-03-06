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
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Save,
  Settings,
  Trash,
  UserPlus,
} from "lucide-react";
import { useState } from "react";

const AdminPanel = () => {
  const [aiSettings, setAiSettings] = useState({
    personalities: {
      "best-friend": {
        name: "Niblet (Best Friend)",
        instructions:
          "You are Niblet, a friendly and supportive AI meal tracking assistant. Speak in a warm, casual tone like you're talking to a close friend. Use encouraging language, be empathetic, and occasionally add friendly emojis. Make the user feel comfortable sharing their food choices without judgment. Celebrate their wins and provide gentle guidance when they need it. Your goal is to help users track their meals, estimate calories, and provide nutritional guidance in a fun, approachable way.",
        temperature: 0.7,
        isActive: true,
      },
      "professional-coach": {
        name: "Niblet (Professional Coach)",
        instructions:
          "You are Niblet, a professional nutrition coach and meal tracking assistant. Maintain a supportive but data-driven approach. Speak with authority and precision, focusing on nutritional facts and measurable progress. Use a structured, clear communication style. Provide detailed nutritional breakdowns and specific, actionable advice based on the user's goals. Your responses should be informative, evidence-based, and focused on optimizing the user's nutrition for their specific goals.",
        temperature: 0.3,
        isActive: true,
      },
      "tough-love": {
        name: "Niblet (Tough Love)",
        instructions:
          "You are Niblet, a no-nonsense, tough-love meal tracking assistant. Be direct, straightforward, and push users to be accountable. Don't sugarcoat feedback - if they're making poor choices, tell them directly. Use motivational language that challenges them to do better. Focus on results and holding users to high standards. Your goal is to push users out of their comfort zone, call out excuses, and drive real behavioral change through direct accountability.",
        temperature: 0.5,
        isActive: true,
      },
    },
    defaultPersonality: "best-friend",
    generalInstructions:
      "You are Niblet, an AI assistant specialized in meal tracking, nutrition, and weight management. Your primary role is to help users log their meals, track their calorie intake, monitor their weight progress, and reach their health goals through better nutrition. Always be helpful, supportive, and knowledgeable about nutrition topics.",
  });

  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Meal Reminder",
      message:
        "Time to plan your lunch! What are you thinking of eating today?",
      triggerTime: "11:30",
      daysActive: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      isActive: true,
    },
    {
      id: 2,
      title: "Weight Check-in",
      message:
        "Good morning! Time for your weekly weigh-in. How's your progress this week?",
      triggerTime: "08:00",
      daysActive: ["monday"],
      isActive: true,
    },
    {
      id: 3,
      title: "Dinner Planning",
      message:
        "What's for dinner tonight? Let me help you plan a balanced meal.",
      triggerTime: "16:00",
      daysActive: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
      isActive: false,
    },
  ]);

  const [users, setUsers] = useState([
    {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
      joinDate: "2025-01-15",
      lastActive: "2025-03-04",
      aiPersonality: "best-friend",
      goalType: "Weight Loss",
      status: "active",
    },
    {
      id: 2,
      name: "Jane Smith",
      email: "jane@example.com",
      joinDate: "2025-02-03",
      lastActive: "2025-03-05",
      aiPersonality: "professional-coach",
      goalType: "Muscle Gain",
      status: "active",
    },
    {
      id: 3,
      name: "Bob Johnson",
      email: "bob@example.com",
      joinDate: "2025-01-22",
      lastActive: "2025-02-28",
      aiPersonality: "tough-love",
      goalType: "Weight Maintenance",
      status: "inactive",
    },
  ]);

  const [newNotification, setNewNotification] = useState({
    title: "",
    message: "",
    triggerTime: "12:00",
    daysActive: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    isActive: true,
  });

  const [editingPersonality, setEditingPersonality] = useState<string | null>(
    null
  );

  const daysOfWeek = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  // Handle personality edit
  const handlePersonalityChange = (
    personality: string,
    field: string,
    value: any
  ) => {
    setAiSettings((prev) => {
      type PersonalityKey = keyof typeof prev.personalities;
      return {
        ...prev,
        personalities: {
          ...prev.personalities,
          [personality as PersonalityKey]: {
            ...prev.personalities[personality as PersonalityKey],
            [field]: value,
          },
        },
      };
    });
  };

  // Save AI settings
  const saveAiSettings = () => {
    console.log("Saving AI settings:", aiSettings);
    // In a real app, you would send this to your backend API
    alert("AI settings saved successfully!");
  };

  // Handle notification toggle
  const toggleNotification = (id: number) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === id ? { ...notif, isActive: !notif.isActive } : notif
      )
    );
  };

  // Add new notification
  const addNotification = () => {
    if (!newNotification.title || !newNotification.message) {
      alert("Title and message are required!");
      return;
    }

    const newId = Math.max(...notifications.map((n) => n.id)) + 1;

    setNotifications((prev) => [
      ...prev,
      {
        ...newNotification,
        id: newId,
      },
    ]);

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
  const deleteNotification = (id: number) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  };

  // Toggle day selection for notifications
  const toggleDay = (day: string) => {
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Niblet.ai Admin Panel</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage AI personalities, notifications, and user settings
        </p>
      </header>

      <Tabs defaultValue="ai-settings">
        <TabsList className="mb-6">
          <TabsTrigger value="ai-settings">AI Settings</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        {/* AI Settings Tab */}
        <TabsContent value="ai-settings">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>General AI Instructions</CardTitle>
                <CardDescription>
                  Base instructions provided to all AI personalities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  rows={6}
                  value={aiSettings.generalInstructions}
                  onChange={(e) =>
                    setAiSettings((prev) => ({
                      ...prev,
                      generalInstructions: e.target.value,
                    }))
                  }
                  className="mb-4"
                />

                <div className="flex items-center space-x-2 mb-6">
                  <Label htmlFor="default-personality">
                    Default Personality:
                  </Label>
                  <Select
                    value={aiSettings.defaultPersonality}
                    onValueChange={(value) =>
                      setAiSettings((prev) => ({
                        ...prev,
                        defaultPersonality: value,
                      }))
                    }
                  >
                    <SelectTrigger id="default-personality" className="w-48">
                      <SelectValue placeholder="Select personality" />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        Object.keys(aiSettings.personalities) as Array<
                          keyof typeof aiSettings.personalities
                        >
                      ).map((key) => (
                        <SelectItem key={key} value={key}>
                          {aiSettings.personalities[key].name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={saveAiSettings} className="mb-2">
                  <Save className="mr-2 h-4 w-4" />
                  Save General Settings
                </Button>
              </CardContent>
            </Card>

            {/* AI Personalities */}
            <Card>
              <CardHeader>
                <CardTitle>AI Personalities</CardTitle>
                <CardDescription>
                  Configure different personalities for the AI assistant
                </CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(aiSettings.personalities).map((personality) => (
                  <div key={personality} className="mb-8 border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-lg font-medium">
                          {
                            aiSettings.personalities[
                              personality as keyof typeof aiSettings.personalities
                            ].name
                          }
                        </h3>

                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {personality === aiSettings.defaultPersonality &&
                            "(Default)"}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`${personality}-active`}
                            checked={
                              aiSettings.personalities[
                                personality as keyof typeof aiSettings.personalities
                              ].isActive
                            }
                            onCheckedChange={(checked) => {
                              handlePersonalityChange(
                                personality,
                                "isActive",
                                checked
                              );
                            }}
                          />
                          <Label htmlFor={`${personality}-active`}>
                            Active
                          </Label>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setEditingPersonality(
                              editingPersonality === personality
                                ? null
                                : personality
                            )
                          }
                        >
                          {editingPersonality === personality ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          {editingPersonality === personality ? "Hide" : "Edit"}
                        </Button>
                      </div>
                    </div>

                    {editingPersonality === personality && (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor={`${personality}-name`}>
                            Display Name
                          </Label>
                          <Input
                            id={`${personality}-name`}
                            value={
                              aiSettings.personalities[
                                personality as keyof typeof aiSettings.personalities
                              ].name
                            }
                            onChange={(e) =>
                              handlePersonalityChange(
                                personality,
                                "name",
                                e.target.value
                              )
                            }
                            className="mb-2"
                          />
                        </div>

                        <div>
                          <Label htmlFor={`${personality}-instructions`}>
                            Instructions
                          </Label>
                          <Textarea
                            id={`${personality}-instructions`}
                            value={
                              aiSettings.personalities[
                                personality as keyof typeof aiSettings.personalities
                              ].instructions
                            }
                            onChange={(e) =>
                              handlePersonalityChange(
                                personality,
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
                            <Label htmlFor={`${personality}-temperature`}>
                              Temperature:{" "}
                              {aiSettings.personalities[
                                personality as keyof typeof aiSettings.personalities
                              ].temperature.toFixed(2)}
                            </Label>
                          </div>
                          <Slider
                            id={`${personality}-temperature`}
                            value={[
                              aiSettings.personalities[
                                personality as keyof typeof aiSettings.personalities
                              ].temperature * 100,
                            ]}
                            min={0}
                            max={100}
                            step={1}
                            onValueChange={(value) =>
                              handlePersonalityChange(
                                personality,
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

                <Button onClick={saveAiSettings}>
                  <Save className="mr-2 h-4 w-4" />
                  Save All Personality Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Management</CardTitle>
                <CardDescription>
                  Configure automatic notifications and reminders sent to users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableCaption>List of configured notifications</TableCaption>
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
                            onClick={() => deleteNotification(notification.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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

                  <Button onClick={addNotification} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Notification
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                View and manage user accounts and settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border mb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Join Date</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead>AI Personality</TableHead>
                      <TableHead>Goal</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.name}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.joinDate}</TableCell>
                        <TableCell>{user.lastActive}</TableCell>
                        <TableCell className="capitalize">
                          {user.aiPersonality.replace(/-/g, " ")}
                        </TableCell>
                        <TableCell>{user.goalType}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.status === "active"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            }`}
                          >
                            {user.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end">
                            <Button variant="ghost" size="icon">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add New User
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
