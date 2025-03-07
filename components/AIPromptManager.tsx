// components/AIPromptManager.tsx
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
import { Textarea } from "@/components/ui/textarea";
import { personalities as personalityDefaults } from "@/lib/assistantService";
import { getUserProfileById } from "@/lib/auth/authService";
import { createOrUpdateUserProfile } from "@/lib/firebase/models/user";
import { ChevronDown, ChevronUp, Plus, Save, Trash } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface AISettings {
  personalities: Record<
    string,
    {
      name: string;
      instructions: string;
      temperature: number;
      topP: number;
      frequencyPenalty: number;
      presencePenalty: number;
      isActive: boolean;
    }
  >;
  defaultPersonality: string;
  generalInstructions: string;
}

const defaultAiSettings: AISettings = {
  personalities: {
    "best-friend": {
      name: "Niblet (Best Friend)",
      instructions:
        personalityDefaults["best-friend"]?.instructions ||
        "You are Niblet, a friendly and supportive AI meal tracking assistant. Speak in a warm, casual tone like you're talking to a close friend. Use encouraging language, be empathetic, and occasionally add friendly emojis. Make the user feel comfortable sharing their food choices without judgment. Celebrate their wins and provide gentle guidance when they need it. Your goal is to help users track their meals, estimate calories, and provide nutritional guidance in a fun, approachable way.",
      temperature: 0.7,
      topP: 1.0,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0,
      isActive: true,
    },
    "professional-coach": {
      name: "Niblet (Professional Coach)",
      instructions:
        personalityDefaults["professional-coach"]?.instructions ||
        "You are Niblet, a professional nutrition coach and meal tracking assistant. Maintain a supportive but data-driven approach. Speak with authority and precision, focusing on nutritional facts and measurable progress. Use a structured, clear communication style. Provide detailed nutritional breakdowns and specific, actionable advice based on the user's goals. Your responses should be informative, evidence-based, and focused on optimizing the user's nutrition for their specific goals.",
      temperature: 0.3,
      topP: 0.8,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0,
      isActive: true,
    },
    "tough-love": {
      name: "Niblet (Tough Love)",
      instructions:
        personalityDefaults["tough-love"]?.instructions ||
        "You are Niblet, a no-nonsense, tough-love meal tracking assistant. Be direct, straightforward, and push users to be accountable. Don't sugarcoat feedback - if they're making poor choices, tell them directly. Use motivational language that challenges them to do better. Focus on results and holding users to high standards. Your goal is to push users out of their comfort zone, call out excuses, and drive real behavioral change through direct accountability.",
      temperature: 0.5,
      topP: 0.9,
      frequencyPenalty: 0.1,
      presencePenalty: 0.1,
      isActive: true,
    },
  },
  defaultPersonality: "best-friend",
  generalInstructions:
    "You are Niblet, an AI assistant specialized in meal tracking, nutrition, and weight management. Your primary role is to help users log their meals, track their calorie intake, monitor their weight progress, and reach their health goals through better nutrition. Always be helpful, supportive, and knowledgeable about nutrition topics.",
};

const AIPromptManager = () => {
  const [aiSettings, setAiSettings] = useState<AISettings>(defaultAiSettings);
  const [editingPersonality, setEditingPersonality] = useState<string | null>(
    null
  );
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newPersonalityName, setNewPersonalityName] = useState("");
  const [newPersonalityKey, setNewPersonalityKey] = useState("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const { data: session } = useSession();

  // Load AI settings from user profile
  const loadAISettings = useCallback(async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    try {
      // Fetch user profile to get AI settings
      const userProfile = await getUserProfileById(session.user.id);

      if (userProfile && userProfile.aiSettings) {
        // Parse stored settings if they exist
        try {
          const parsedSettings =
            typeof userProfile.aiSettings === "string"
              ? JSON.parse(userProfile.aiSettings)
              : userProfile.aiSettings;

          setAiSettings(parsedSettings);
        } catch (parseError) {
          console.error("Error parsing AI settings:", parseError);
          // If parsing fails, use default settings
          setAiSettings(defaultAiSettings);
        }
      } else {
        // Use default settings if none exist
        setAiSettings(defaultAiSettings);

        // Also try to get current personality from profile if available
        if (userProfile && userProfile.aiPersonality) {
          setAiSettings((prev) => ({
            ...prev,
            defaultPersonality: userProfile.aiPersonality as string,
          }));
        }
      }
    } catch (error) {
      console.error("Error loading AI settings:", error);
      setErrorMessage("Failed to load AI settings");
      // Fall back to default settings
      setAiSettings(defaultAiSettings);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  // Initial load
  useEffect(() => {
    if (session?.user?.id) {
      loadAISettings();
    } else {
      setIsLoading(false);
    }
  }, [loadAISettings, session?.user?.id]);

  // Handle personality changes
  const handlePersonalityChange = (
    personalityKey: string,
    field: string,
    value: any
  ) => {
    setAiSettings((prev) => {
      const updatedPersonalities = { ...prev.personalities };

      if (!updatedPersonalities[personalityKey]) {
        updatedPersonalities[personalityKey] = {
          name: "",
          instructions: "",
          temperature: 0.5,
          topP: 0.95,
          frequencyPenalty: 0,
          presencePenalty: 0,
          isActive: true,
        };
      }

      updatedPersonalities[personalityKey] = {
        ...updatedPersonalities[personalityKey],
        [field]: value,
      };

      return {
        ...prev,
        personalities: updatedPersonalities,
      };
    });
  };

  // Save AI settings to database
  const saveAISettings = async () => {
    if (!session?.user?.id) {
      setErrorMessage("You must be logged in to save settings");
      toast.error("You must be logged in to save settings");
      return;
    }

    setIsSaving(true);
    setSavedMessage(null);
    setErrorMessage(null);

    try {
      // Save to user profile in database
      await createOrUpdateUserProfile(session.user.id, {
        aiSettings: aiSettings,
        aiPersonality: aiSettings.defaultPersonality, // Update active personality
      });

      setSavedMessage("AI settings saved successfully!");
      toast.success("AI settings saved successfully!");
    } catch (error) {
      console.error("Error saving AI settings:", error);
      setErrorMessage("Failed to save AI settings");
      toast.error("Failed to save AI settings");
    } finally {
      setIsSaving(false);
    }
  };

  // Add a new personality
  const addNewPersonality = () => {
    if (!newPersonalityKey || !newPersonalityName) {
      setErrorMessage("Personality key and name are required");
      toast.error("Personality key and name are required");
      return;
    }

    if (aiSettings.personalities[newPersonalityKey]) {
      setErrorMessage("Personality key already exists");
      toast.error("Personality key already exists");
      return;
    }

    setAiSettings((prev) => ({
      ...prev,
      personalities: {
        ...prev.personalities,
        [newPersonalityKey]: {
          name: newPersonalityName,
          instructions:
            "You are Niblet, a nutrition assistant. Provide guidance and support for the user's health goals.",
          temperature: 0.5,
          topP: 0.95,
          frequencyPenalty: 0,
          presencePenalty: 0,
          isActive: true,
        },
      },
    }));

    toast.success(`Created new personality: ${newPersonalityName}`);
    setNewPersonalityKey("");
    setNewPersonalityName("");
    setIsCreatingNew(false);
    setEditingPersonality(newPersonalityKey); // Start editing the new personality
  };

  // Delete a personality
  const deletePersonality = (key: string) => {
    if (Object.keys(aiSettings.personalities).length <= 1) {
      setErrorMessage("Cannot delete the last personality");
      toast.error("Cannot delete the last personality");
      return;
    }

    if (key === aiSettings.defaultPersonality) {
      setErrorMessage(
        "Cannot delete the default personality. Please change the default first."
      );
      toast.error(
        "Cannot delete the default personality. Please change the default first."
      );
      return;
    }

    setAiSettings((prev) => {
      const updated = { ...prev };
      const { [key]: _, ...rest } = updated.personalities;
      updated.personalities = rest;

      if (editingPersonality === key) {
        setEditingPersonality(null);
      }

      return updated;
    });

    toast.success(`Deleted personality: ${aiSettings.personalities[key].name}`);
  };

  // Generate a key from the name
  const generateKeyFromName = () => {
    if (!newPersonalityName) return;

    const key = newPersonalityName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    setNewPersonalityKey(key);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
            <Label htmlFor="default-personality">Default Personality:</Label>
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
          <div className="flex justify-between items-center">
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
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Personality
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* New Personality Form */}
          {isCreatingNew && (
            <div className="mb-8 border p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
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

          {/* Existing Personalities */}
          {Object.keys(aiSettings.personalities).map((personalityKey) => (
            <div key={personalityKey} className="mb-8 border rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-medium">
                    {aiSettings.personalities[personalityKey].name}
                  </h3>

                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {personalityKey === aiSettings.defaultPersonality &&
                      "(Default)"}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
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
                    <Label htmlFor={`${personalityKey}-active`}>Active</Label>
                  </div>
                  <div className="flex space-x-2">
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
                      {editingPersonality === personalityKey ? "Hide" : "Edit"}
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

              {editingPersonality === personalityKey && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor={`${personalityKey}-name`}>
                      Display Name
                    </Label>
                    <Input
                      id={`${personalityKey}-name`}
                      value={aiSettings.personalities[personalityKey].name}
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
                        aiSettings.personalities[personalityKey].instructions
                      }
                      onChange={(e) =>
                        handlePersonalityChange(
                          personalityKey,
                          "instructions",
                          e.target.value
                        )
                      }
                      rows={8}
                      className="mb-2"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          aiSettings.personalities[personalityKey].temperature *
                            100,
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
                        <span>More Consistent</span>
                        <span>More Creative</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <Label htmlFor={`${personalityKey}-top-p`}>
                          Top P:{" "}
                          {aiSettings.personalities[
                            personalityKey
                          ].topP.toFixed(2)}
                        </Label>
                      </div>
                      <Slider
                        id={`${personalityKey}-top-p`}
                        value={[
                          aiSettings.personalities[personalityKey].topP * 100,
                        ]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(value) =>
                          handlePersonalityChange(
                            personalityKey,
                            "topP",
                            value[0] / 100
                          )
                        }
                        className="mb-4"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Focused Output</span>
                        <span>Diverse Output</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <Label htmlFor={`${personalityKey}-frequency-penalty`}>
                          Frequency Penalty:{" "}
                          {aiSettings.personalities[
                            personalityKey
                          ].frequencyPenalty.toFixed(2)}
                        </Label>
                      </div>
                      <Slider
                        id={`${personalityKey}-frequency-penalty`}
                        value={[
                          aiSettings.personalities[personalityKey]
                            .frequencyPenalty * 100,
                        ]}
                        min={0}
                        max={200}
                        step={1}
                        onValueChange={(value) =>
                          handlePersonalityChange(
                            personalityKey,
                            "frequencyPenalty",
                            value[0] / 100
                          )
                        }
                        className="mb-4"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Allow Repetition</span>
                        <span>Avoid Repetition</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <Label htmlFor={`${personalityKey}-presence-penalty`}>
                          Presence Penalty:{" "}
                          {aiSettings.personalities[
                            personalityKey
                          ].presencePenalty.toFixed(2)}
                        </Label>
                      </div>
                      <Slider
                        id={`${personalityKey}-presence-penalty`}
                        value={[
                          aiSettings.personalities[personalityKey]
                            .presencePenalty * 100,
                        ]}
                        min={0}
                        max={200}
                        step={1}
                        onValueChange={(value) =>
                          handlePersonalityChange(
                            personalityKey,
                            "presencePenalty",
                            value[0] / 100
                          )
                        }
                        className="mb-4"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Stay On Topic</span>
                        <span>Explore New Topics</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Status Messages */}
          {errorMessage && (
            <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-md text-red-800 dark:text-red-200 mb-4">
              {errorMessage}
            </div>
          )}

          {savedMessage && (
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-md text-green-800 dark:text-green-200 mb-4">
              {savedMessage}
            </div>
          )}

          <Button
            onClick={saveAISettings}
            disabled={isSaving || !session?.user?.id}
            className="min-w-32"
          >
            {isSaving ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save All Settings
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIPromptManager;
