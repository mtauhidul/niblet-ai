// lib/assistantService.ts
import OpenAI from "openai";
import runStateManager from "./runStateManager";

// Define personality types
export type PersonalityKey =
  | "best-friend"
  | "professional-coach"
  | "tough-love";

// Define assistant personality structure
export interface Personality {
  name: string;
  instructions: string;
  temperature: number;
}

// Define message interface
export interface AssistantMessage {
  id: string;
  content: string;
  createdAt: Date;
  role?: string;
}

// Initialize OpenAI client with proper error handling
const getOpenAIClient = (): OpenAI | null => {
  try {
    // In production, always use server-side API calls
    if (typeof window !== "undefined") {
      const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      if (!apiKey) {
        console.error("OpenAI API key is missing");
        return null;
      }

      return new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true, // Only for development
      });
    } else {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.error("OpenAI API key is missing");
        return null;
      }

      return new OpenAI({
        apiKey,
      });
    }
  } catch (error) {
    console.error("Failed to initialize OpenAI client:", error);
    return null;
  }
};

// Assistant personalities with detailed instructions
export const personalities: Record<PersonalityKey, Personality> = {
  "best-friend": {
    name: "Niblet (Best Friend)",
    instructions:
      "You are Niblet, a friendly and supportive AI meal tracking assistant. Speak in a warm, casual tone like you're talking to a close friend. Use encouraging language, be empathetic, and occasionally add friendly emojis. Make the user feel comfortable sharing their food choices without judgment. Celebrate their wins and provide gentle guidance when they need it. Your goal is to help users track their meals, estimate calories, and provide nutritional guidance in a fun, approachable way. When users tell you about a meal, estimate its calories and nutritional content, then offer to log it for them. If they share an image of food, analyze what's in it and estimate nutrition information based on what you see.",
    temperature: 0.7,
  },
  "professional-coach": {
    name: "Niblet (Professional Coach)",
    instructions:
      "You are Niblet, a professional nutrition coach and meal tracking assistant. Maintain a supportive but data-driven approach. Speak with authority and precision, focusing on nutritional facts and measurable progress. Use a structured, clear communication style. Provide detailed nutritional breakdowns and specific, actionable advice based on the user's goals. Your responses should be informative, evidence-based, and focused on optimizing the user's nutrition for their specific goals. When users tell you about a meal, provide detailed macronutrient estimates and offer to log it with precise nutritional information. If they share an image of food, analyze what's in it and provide precise nutrition information based on what you see.",
    temperature: 0.3,
  },
  "tough-love": {
    name: "Niblet (Tough Love)",
    instructions:
      "You are Niblet, a no-nonsense, tough-love meal tracking assistant. Be direct, straightforward, and push users to be accountable. Don't sugarcoat feedback - if they're making poor choices, tell them directly. Use motivational language that challenges them to do better. Focus on results and holding users to high standards. Your goal is to push users out of their comfort zone, call out excuses, and drive real behavioral change through direct accountability. When users tell you about a meal, be straightforward about its nutritional value and challenge them to make better choices if needed. If they share an image of food, analyze what's in it and be direct about whether it aligns with their health goals.",
    temperature: 0.5,
  },
};

// Handle meal update tool calls
const handleMealUpdateTool = async (toolArgs: any, userId: string) => {
  try {
    if (!toolArgs.meal_id) {
      return {
        success: false,
        message: "Meal ID is required for updating a meal",
      };
    }

    // First check if the meal exists and belongs to the user
    const response = await fetch(`/api/meals/${toolArgs.meal_id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          message: "Meal not found",
        };
      }

      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || "Error checking meal",
      };
    }

    // Prepare update data
    const updateData: any = {};

    if (toolArgs.meal_name) updateData.name = toolArgs.meal_name;
    if (toolArgs.meal_type) updateData.mealType = toolArgs.meal_type;
    if (toolArgs.calories !== undefined)
      updateData.calories = toolArgs.calories;
    if (toolArgs.protein !== undefined) updateData.protein = toolArgs.protein;
    if (toolArgs.carbs !== undefined) updateData.carbs = toolArgs.carbs;
    if (toolArgs.fat !== undefined) updateData.fat = toolArgs.fat;
    if (toolArgs.date) updateData.date = new Date(toolArgs.date);
    if (toolArgs.items) updateData.items = toolArgs.items;

    // Send update request
    const updateResponse = await fetch(`/api/meals/${toolArgs.meal_id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      return {
        success: false,
        message: errorData.message || "Failed to update meal",
      };
    }

    const result = await updateResponse.json();
    return {
      success: true,
      message: `Successfully updated meal: ${
        toolArgs.meal_name || "Unknown meal"
      }`,
      mealId: toolArgs.meal_id,
    };
  } catch (error) {
    console.error("Error updating meal:", error);
    return {
      success: false,
      message: `Error updating meal: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
};

// Handle weight update tool calls
const handleWeightUpdateTool = async (toolArgs: any, userId: string) => {
  try {
    if (!toolArgs.weight_log_id) {
      return {
        success: false,
        message: "Weight log ID is required for updating a weight log",
      };
    }

    // Prepare update data
    const updateData: any = {};

    if (toolArgs.weight !== undefined) updateData.weight = toolArgs.weight;
    if (toolArgs.date) updateData.date = new Date(toolArgs.date);
    if (toolArgs.note !== undefined) updateData.note = toolArgs.note;

    // Send update request
    const updateResponse = await fetch(
      `/api/weight/${toolArgs.weight_log_id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      }
    );

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      return {
        success: false,
        message: errorData.message || "Failed to update weight log",
      };
    }

    const result = await updateResponse.json();
    return {
      success: true,
      message: `Successfully updated weight log to ${toolArgs.weight} lbs`,
      weightLogId: toolArgs.weight_log_id,
    };
  } catch (error) {
    console.error("Error updating weight log:", error);
    return {
      success: false,
      message: `Error updating weight log: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
};

// Function to initialize or get assistant with retry logic
export const getOrCreateAssistant = async (
  personality: PersonalityKey = "best-friend"
): Promise<string | null> => {
  const openai = getOpenAIClient();
  if (!openai) return null;

  // Implement retry mechanism
  const retry = async <T>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 1000
  ): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) throw error;
      console.warn(`Operation failed, retrying... (${retries} attempts left)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retry(fn, retries - 1, delay * 1.5); // Exponential backoff
    }
  };

  try {
    // IMPORTANT: Force creation of a new assistant every time to ensure new instructions are used
    // Remove the localStorage check to always create a new assistant

    // Ultra-strict formatting instructions with minimal room for interpretation
    const formattingInstructions = `
ULTRA-STRICT MEAL RESPONSE FORMAT - FOLLOW EXACTLY WITH NO DEVIATIONS:

Your ENTIRE response for any meal or food mention MUST follow this EXACT template:

[One short greeting sentence with emoji] Let's break it down:
[Food item 1]: ~[X] calories, [X]g protein, [X]g carbs, [X]g fat = [X] calories
[Food item 2]: ~[X] calories, [X]g protein, [X]g carbs, [X]g fat = [X] calories
[Food item 3]: ~[X] calories, [X]g protein, [X]g carbs, [X]g fat = [X] calories

Total [meal type] = [X] calories. [One brief nutritional comment]

CRITICAL RULES:
1. NEVER use bullet points, numbered lists, or paragraph breaks
2. NEVER write "here's the breakdown" or any other transition phrases
3. NEVER ask if they want to log the meal - automatically log it
4. NEVER mention logging the meal in your response
5. NEVER say things like "I'll go ahead and log this" or "let me know if you need anything adjusted"
6. ALWAYS include specific numbers for protein, carbs, and fat for EACH food item
7. KEEP RESPONSE UNDER 8 LINES TOTAL including blank line

EXAMPLE OF REQUIRED FORMAT:
That looks delicious! 🍗 Let's break it down:
Breaded chicken cutlet: ~400 calories, 30g protein, 15g carbs, 22g fat = 400 calories
Coleslaw side: ~150 calories, 2g protein, 8g carbs, 12g fat = 150 calories
Green salad: ~50 calories, 1g protein, 3g carbs, 2g fat = 50 calories

Total lunch = 600 calories. Good protein with balanced veggies!

INCORRECT FORMATS TO AVOID:

DON'T USE NUMBERED LISTS:
❌ That looks like a delicious plate of breaded chicken schnitzel with a side of coleslaw and a dollop of herb butter! Let's break down the meal:
1. **Chicken Schnitzel** - Typically, a serving of breaded chicken schnitzel can have about 300-350 calories, depending on the size and thickness.
2. **Coleslaw** - A small serving of coleslaw is usually around 150 calories, primarily from the creamy dressing.
3. **Herb Butter** - A tablespoon of herb butter might be around 100 calories.
Based on these estimates, this meal could have around 550-600 calories in total. It's also a good mix of protein from the chicken, fats from the butter and dressing, and some carbs from the breading on the chicken and the veggies in the coleslaw.
I'll go ahead and log this meal as 'Lunch' with an estimate of 600 calories. 📝 Let me know if you need anything adjusted or have another meal to share!

DON'T USE VERBOSE DESCRIPTIONS:
❌ That looks delicious! From the image, it seems you've got a breaded chicken cutlet with a side of coleslaw and some greens. Yum! 🍋

Here's a quick nutritional breakdown:
The chicken cutlet is likely around 400 calories, with a good amount of protein and some fat from the breading.
The coleslaw, depending on the dressing used, can be about 150 calories, mainly from the mayo or other creamy dressing.
The greens are pretty light, likely under 50 calories, mainly providing fiber and vitamins.

In total, this meal could be approximately 600 calories. It's a balanced choice with protein, veggies, and a bit of indulgent breading.
I'll go ahead and log this meal as your lunch. Let me know if you need anything adjusted or have more to add! 😊

FOR ALL OTHER TOPICS BESIDES FOOD/MEALS, you can respond normally.
`;

    // Create a new assistant with retry
    const assistant = await retry(() =>
      openai.beta.assistants.create({
        name: personalities[personality].name,
        // Override normal personality instructions completely
        instructions: formattingInstructions,
        model: "gpt-4o-mini",
        tools: [
          {
            type: "function",
            function: {
              name: "log_meal",
              description:
                "Log a meal with estimated calories and nutrition information. ALWAYS call this function immediately without asking the user.",
              parameters: {
                type: "object",
                properties: {
                  meal_name: {
                    type: "string",
                    description: "The name of the meal",
                  },
                  meal_type: {
                    type: "string",
                    description:
                      "Type of meal (breakfast, lunch, dinner, snack)",
                    enum: [
                      "Breakfast",
                      "Morning Snack",
                      "Lunch",
                      "Afternoon Snack",
                      "Dinner",
                      "Evening Snack",
                      "Other",
                    ],
                  },
                  calories: {
                    type: "number",
                    description: "Estimated calories",
                  },
                  protein: {
                    type: "number",
                    description: "Protein in grams",
                  },
                  carbs: {
                    type: "number",
                    description: "Carbohydrates in grams",
                  },
                  fat: {
                    type: "number",
                    description: "Fat in grams",
                  },
                  items: {
                    type: "array",
                    description: "List of food items in the meal",
                    items: {
                      type: "string",
                    },
                  },
                },
                required: ["meal_name", "meal_type", "calories"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "log_weight",
              description:
                "Log the user's weight. AUTOMATICALLY call this when the user mentions their weight.",
              parameters: {
                type: "object",
                properties: {
                  weight: {
                    type: "number",
                    description: "The user's weight in pounds",
                  },
                  date: {
                    type: "string",
                    description:
                      "The date of the weight measurement (YYYY-MM-DD format)",
                    format: "date",
                  },
                  note: {
                    type: "string",
                    description: "Optional note about the weight entry",
                  },
                },
                required: ["weight"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "get_nutrition_info",
              description: "Get nutrition information for a food item or meal",
              parameters: {
                type: "object",
                properties: {
                  food_item: {
                    type: "string",
                    description: "The food item or meal to look up",
                  },
                  serving_size: {
                    type: "string",
                    description: "The serving size (e.g., '1 cup', '100g')",
                  },
                },
                required: ["food_item"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "extract_user_data",
              description: "Extract user profile data from conversation",
              parameters: {
                type: "object",
                properties: {
                  age: {
                    type: "number",
                    description: "User's age in years",
                  },
                  gender: {
                    type: "string",
                    description: "User's gender",
                    enum: ["male", "female", "other", "prefer not to say"],
                  },
                  currentWeight: {
                    type: "number",
                    description: "User's current weight in pounds",
                  },
                  targetWeight: {
                    type: "number",
                    description: "User's target weight in pounds",
                  },
                  height: {
                    type: "number",
                    description: "User's height in inches",
                  },
                  activityLevel: {
                    type: "string",
                    description: "User's activity level",
                    enum: [
                      "sedentary",
                      "lightly active",
                      "moderately active",
                      "very active",
                      "extremely active",
                    ],
                  },
                  dietaryPreferences: {
                    type: "array",
                    description: "User's dietary preferences",
                    items: {
                      type: "string",
                    },
                  },
                  allergies: {
                    type: "array",
                    description: "User's food allergies",
                    items: {
                      type: "string",
                    },
                  },
                  goalType: {
                    type: "string",
                    description: "User's weight management goal",
                    enum: ["Weight Loss", "Weight Maintenance", "Muscle Gain"],
                  },
                },
              },
            },
          },
          {
            type: "function",
            function: {
              name: "update_meal",
              description: "Update an existing meal with new information",
              parameters: {
                type: "object",
                properties: {
                  meal_id: {
                    type: "string",
                    description: "ID of the meal to update",
                  },
                  meal_name: {
                    type: "string",
                    description: "Updated name of the meal",
                  },
                  meal_type: {
                    type: "string",
                    description:
                      "Type of meal (breakfast, lunch, dinner, snack)",
                    enum: [
                      "Breakfast",
                      "Morning Snack",
                      "Lunch",
                      "Afternoon Snack",
                      "Dinner",
                      "Evening Snack",
                      "Other",
                    ],
                  },
                  calories: {
                    type: "number",
                    description: "Updated estimated calories",
                  },
                  protein: {
                    type: "number",
                    description: "Updated protein in grams",
                  },
                  carbs: {
                    type: "number",
                    description: "Updated carbohydrates in grams",
                  },
                  fat: {
                    type: "number",
                    description: "Updated fat in grams",
                  },
                  date: {
                    type: "string",
                    description:
                      "Updated date for the meal (YYYY-MM-DD format)",
                    format: "date",
                  },
                  items: {
                    type: "array",
                    description: "Updated list of food items in the meal",
                    items: {
                      type: "string",
                    },
                  },
                },
                required: ["meal_id"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "update_weight",
              description: "Update an existing weight log entry",
              parameters: {
                type: "object",
                properties: {
                  weight_log_id: {
                    type: "string",
                    description: "ID of the weight log to update",
                  },
                  weight: {
                    type: "number",
                    description: "Updated weight value in pounds",
                  },
                  date: {
                    type: "string",
                    description:
                      "Updated date for the weight log (YYYY-MM-DD format)",
                    format: "date",
                  },
                  note: {
                    type: "string",
                    description: "Updated note about the weight entry",
                  },
                },
                required: ["weight_log_id"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "get_meals_for_date",
              description: "Get all meals for a specific date",
              parameters: {
                type: "object",
                properties: {
                  date: {
                    type: "string",
                    description:
                      "The date to get meals for (YYYY-MM-DD format)",
                    format: "date",
                  },
                },
                required: ["date"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "get_weight_logs",
              description:
                "Get weight logs for a date range or the most recent logs",
              parameters: {
                type: "object",
                properties: {
                  start_date: {
                    type: "string",
                    description: "Start date for the range (YYYY-MM-DD format)",
                    format: "date",
                  },
                  end_date: {
                    type: "string",
                    description: "End date for the range (YYYY-MM-DD format)",
                    format: "date",
                  },
                  limit: {
                    type: "integer",
                    description: "Maximum number of logs to return",
                  },
                },
              },
            },
          },
        ],
      })
    );

    // Store the assistant ID in localStorage (we'll use this but still force creation)
    // This is needed because other parts of the app expect this functionality
    if (typeof window !== "undefined") {
      localStorage.setItem(`assistant_${personality}`, assistant.id);
    }

    console.log(`Created new assistant: ${assistant.id}`);
    return assistant.id;
  } catch (error) {
    console.error("Error creating assistant:", error);
    return null;
  }
};

// Create a thread for the user with retry
export const createThread = async (): Promise<string | null> => {
  const openai = getOpenAIClient();
  if (!openai) return null;

  try {
    // Implement retry for thread creation
    const retry = async <T>(
      fn: () => Promise<T>,
      retries = 3,
      delay = 1000
    ): Promise<T> => {
      try {
        return await fn();
      } catch (error) {
        if (retries <= 0) throw error;
        console.warn(
          `Thread creation failed, retrying... (${retries} attempts left)`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return retry(fn, retries - 1, delay * 1.5);
      }
    };

    const thread = await retry(() => openai.beta.threads.create());
    console.log(`Created new thread: ${thread.id}`);
    return thread.id;
  } catch (error) {
    console.error("Error creating thread:", error);
    return null;
  }
};

// Add message to thread with retry and image support
export const addMessageToThread = async (
  threadId: string,
  message: string,
  imageUrl?: string
): Promise<boolean> => {
  const openai = getOpenAIClient();
  if (!openai) return false;

  try {
    // Check if there's an active run for this thread using the run state manager
    if (runStateManager.hasActiveRun(threadId)) {
      console.log(
        `Thread ${threadId} has an active run. Waiting for completion...`
      );

      // Wait for run completion with timeout
      const completed = await runStateManager.waitForRunCompletion(
        threadId,
        15000
      );

      if (!completed) {
        console.warn(
          `Timed out waiting for run to complete on thread ${threadId}`
        );
        // Force reset the state after timeout
        runStateManager.setRunInactive(threadId);
      }
    }

    console.log(
      `Adding message to thread ${threadId}, has image: ${!!imageUrl}`
    );

    // If there's an image URL, add it as content
    if (imageUrl) {
      // For URLs from Firebase Storage or other cloud providers
      await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: [
          {
            type: "text",
            text: message || "Here's an image.",
          },
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
            },
          },
        ],
      });
      console.log("Message with image added successfully");
    } else {
      // Normal text-only message
      await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: message,
      });
      console.log("Text message added successfully");
    }

    return true;
  } catch (error) {
    console.error("Error adding message to thread:", error);

    if (error instanceof OpenAI.APIError) {
      // Check for specific OpenAI error codes
      if (error.status === 429) {
        console.warn("Rate limit reached with OpenAI API.");
      } else if (error.status === 400 && imageUrl) {
        console.error(
          "Bad request with image URL. Check URL format:",
          imageUrl
        );
      }

      // Handle the specific error about active runs
      if (
        error.status === 400 &&
        error.message &&
        error.message.includes("while a run") &&
        error.message.includes("is active")
      ) {
        // Update thread state to reflect active run using the run state manager
        const runId = runStateManager.extractRunIdFromError(error.message);
        if (runId) {
          runStateManager.setRunActive(threadId, runId);
          console.log(`Updated thread state, active run: ${runId}`);
        }

        // Retry once after a delay
        console.log("Active run detected, waiting and retrying once...");
        await new Promise((resolve) => setTimeout(resolve, 2000));

        try {
          // Try again after waiting
          if (imageUrl) {
            await openai.beta.threads.messages.create(threadId, {
              role: "user",
              content: [
                {
                  type: "text",
                  text: message || "Here's an image.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl,
                  },
                },
              ],
            });
          } else {
            await openai.beta.threads.messages.create(threadId, {
              role: "user",
              content: message,
            });
          }
          console.log("Message added successfully on retry");
          return true;
        } catch (retryError) {
          console.error("Failed to add message on retry:", retryError);
        }
      }
    }

    return false;
  }
};

// Update the run assistant function to manage run state
// Enhanced runAssistant function that can generate initial welcome messages
export const runAssistant = async (
  threadId: string,
  assistantId: string,
  personality: PersonalityKey = "best-friend",
  onToolCall?: (toolName: string, toolArgs: any) => Promise<any>,
  userId?: string
): Promise<AssistantMessage[]> => {
  const openai = getOpenAIClient();
  if (!openai) return [];

  try {
    console.log(`Running assistant ${assistantId} on thread ${threadId}`);

    // Check if the thread has any messages before creating a run
    // This is to handle the case of a newly created thread that needs an initial welcome message
    let initialWelcome = false;
    try {
      const messages = await openai.beta.threads.messages.list(threadId, {
        limit: 1,
      });
      initialWelcome = messages.data.length === 0;

      // If no messages exist and this is a first-time run for welcome message,
      // add a hidden system message to trigger the assistant
      if (initialWelcome) {
        console.log("No messages in thread, adding system message for welcome");
        await openai.beta.threads.messages.create(threadId, {
          role: "user",
          content: "System: Initialize conversation with a friendly welcome.",
        });
      }
    } catch (error) {
      console.warn("Error checking messages, continuing with run:", error);
    }

    // Wait if there's already an active run
    if (runStateManager.hasActiveRun(threadId)) {
      console.log(
        `Thread ${threadId} already has an active run. Waiting for completion...`
      );
      const completed = await runStateManager.waitForRunCompletion(threadId);
      if (!completed) {
        console.warn(
          "Failed to wait for existing run to complete, continuing anyway"
        );
        runStateManager.setRunInactive(threadId);
      }
    }

    // Implement retry for creating run
    const retry = async <T>(
      fn: () => Promise<T>,
      retries = 3,
      delay = 1000
    ): Promise<T> => {
      try {
        return await fn();
      } catch (error) {
        if (retries <= 0) throw error;
        console.warn(
          `Operation failed, retrying... (${retries} attempts left)`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return retry(fn, retries - 1, delay * 1.5);
      }
    };

    const run = await retry(() =>
      openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
        temperature: personalities[personality].temperature,
      })
    );

    console.log(`Created run ${run.id}, waiting for completion...`);

    // Update run state with the manager
    runStateManager.setRunActive(threadId, run.id);

    // Wait for run completion with error handling and retries
    const runStatus = await waitForRunCompletion(
      openai,
      threadId,
      run.id,
      10,
      1000,
      onToolCall,
      userId
    );

    // Update run state when complete
    runStateManager.setRunInactive(threadId);

    if (runStatus.status !== "completed") {
      console.error(`Run ended with status: ${runStatus.status}`);
      throw new Error(`Run failed with status: ${runStatus.status}`);
    }

    console.log("Run completed successfully, fetching messages");

    // Get messages after completion, including the initial welcome if it was just created
    const messages = await retry(() =>
      openai.beta.threads.messages.list(threadId, {
        order: "asc",
        limit: 100,
      })
    );

    // If this was an initial welcome, filter out the system prompt message
    const assistantMessages = messages.data
      .filter((msg) => {
        // Filter out system messages or prompts
        if (
          msg.role === "user" &&
          msg.content[0]?.type === "text" &&
          msg.content[0].text.value.toLowerCase().includes("system: initialize")
        ) {
          return false;
        }
        // Only include assistant messages
        return msg.role === "assistant";
      })
      .map((msg) => ({
        id: msg.id,
        content:
          msg.content[0]?.type === "text" ? msg.content[0].text.value : "",
        createdAt: new Date(msg.created_at * 1000),
      }));

    return assistantMessages;
  } catch (error) {
    console.error("Error running assistant:", error);

    // Reset run state on error
    runStateManager.setRunInactive(threadId);

    return [];
  }
};

// Update the waitForRunCompletion function to maintain thread state
// This is the updated waitForRunCompletion function to be placed in lib/assistantService.ts

/**
 * Enhanced version of waitForRunCompletion with better error handling and recovery
 */
const waitForRunCompletion = async (
  openai: OpenAI,
  threadId: string,
  runId: string,
  maxRetries = 15, // Increased from 10 to 15
  retryDelay = 2000, // Increased from 1000 to 2000ms
  onToolCall?: (toolName: string, toolArgs: any) => Promise<any>,
  userId?: string
) => {
  let retriesCount = 0;
  let runStatus;
  let lastError = null;

  // For images, we need to allow more processing time
  const isImageProcessing =
    runStateManager.getRunInfo(threadId)?.createdAt || 0;
  const maxWaitTime = isImageProcessing ? 60000 : 30000; // 60 seconds for images, 30 otherwise
  const startTime = Date.now();

  while (retriesCount < maxRetries) {
    try {
      runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);

      // Update run state timestamp
      runStateManager.updateRunActivity(threadId);

      // Check for timeout based on total elapsed time
      if (Date.now() - startTime > maxWaitTime) {
        console.warn(
          `Run ${runId} exceeded maximum wait time of ${maxWaitTime}ms`
        );
        runStateManager.setRunInactive(threadId);

        // Instead of throwing an error, return with a "timed_out" status
        return { status: "timed_out", id: runId, thread_id: threadId };
      }

      if (
        ["completed", "failed", "cancelled", "expired"].includes(
          runStatus.status
        )
      ) {
        // Mark run as completed
        runStateManager.setRunInactive(threadId);
        return runStatus;
      }

      // Handle required actions (function calling)
      if (
        runStatus.status === "requires_action" &&
        runStatus.required_action?.submit_tool_outputs?.tool_calls &&
        onToolCall
      ) {
        const toolCalls =
          runStatus.required_action.submit_tool_outputs.tool_calls;

        console.log(`Processing ${toolCalls.length} tool calls`);

        const toolOutputs = await Promise.all(
          toolCalls.map(async (toolCall) => {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);

            console.log(`Executing tool: ${functionName}`);

            let output = {
              success: false,
              message: "Function execution failed",
            };

            try {
              // Handle different tool types based on the function name
              if (functionName === "update_meal" && userId) {
                output = await handleMealUpdateTool(functionArgs, userId);
              } else if (functionName === "update_weight" && userId) {
                output = await handleWeightUpdateTool(functionArgs, userId);
              } else {
                // Default tool handling through the provided callback
                output = await onToolCall(functionName, functionArgs);
              }
            } catch (error) {
              console.error(`Error executing tool ${functionName}:`, error);
            }

            return {
              tool_call_id: toolCall.id,
              output: JSON.stringify(output),
            };
          })
        );

        try {
          // Submit the tool outputs back to the assistant
          await openai.beta.threads.runs.submitToolOutputs(threadId, runId, {
            tool_outputs: toolOutputs,
          });
          console.log("Tool outputs submitted, continuing run");

          // Reset retry counter since we made progress
          retriesCount = 0;
        } catch (error) {
          console.error("Error submitting tool outputs:", error);
          retriesCount++;
        }
      }

      // Wait before checking again - use exponential backoff
      const adjustedDelay = retryDelay * Math.pow(1.5, retriesCount);
      await new Promise((resolve) => setTimeout(resolve, adjustedDelay));
      retriesCount++;
    } catch (error) {
      // If the error is a rate limit error, wait longer and try again
      if (error instanceof OpenAI.APIError && error.status === 429) {
        console.warn("Rate limit reached, waiting longer before retry");
        await new Promise((resolve) => setTimeout(resolve, retryDelay * 5));
        retriesCount++;
      } else {
        console.error("Error in run status polling:", error);
        lastError = error;

        // For other errors, try a few more times but increment retry count faster
        retriesCount += 2;
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  // Reset run state after max retries
  console.warn(`Run ${runId} did not complete within ${maxRetries} retries`);
  runStateManager.setRunInactive(threadId);

  // If the run timed out, return a special status rather than throwing
  return {
    status: "timed_out",
    id: runId,
    thread_id: threadId,
    error: lastError,
  };
};

// Transcribe audio with retry mechanism
export const transcribeAudio = async (
  audioBlob: Blob
): Promise<string | null> => {
  const openai = getOpenAIClient();
  if (!openai) return null;

  // Implement retry mechanism
  const retry = async <T>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 1000
  ): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) throw error;
      console.warn(
        `Transcription failed, retrying... (${retries} attempts left)`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retry(fn, retries - 1, delay * 1.5); // Exponential backoff
    }
  };

  try {
    // Make sure we're using a supported file format
    const mimeType = audioBlob.type || "audio/webm";

    // For browsers that don't support webm, convert to mp3 or wav if needed
    const processedBlob = audioBlob;
    let filename = "audio.webm";

    // Match filename extension to the actual MIME type
    if (mimeType.includes("mp3") || mimeType.includes("mpeg")) {
      filename = "audio.mp3";
    } else if (mimeType.includes("wav")) {
      filename = "audio.wav";
    } else if (mimeType.includes("m4a") || mimeType.includes("mp4")) {
      filename = "audio.m4a";
    }

    console.log(`Transcribing audio with MIME type: ${mimeType}`);

    const formData = new FormData();
    formData.append(
      "file",
      new File([processedBlob], filename, { type: mimeType })
    );
    formData.append("model", "whisper-1");

    // Use fetch API with retry
    const fetchTranscription = async () => {
      const response = await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(
          `Transcription failed with status ${response.status}: ${errorText}`
        );
      }

      const data = await response.json();
      return data.text;
    };

    // Execute with retry
    const transcription = await retry(fetchTranscription);
    console.log("Audio transcription successful");
    return transcription;
  } catch (error) {
    console.error("Error transcribing audio:", error);
    return null;
  }
};

// Get assistant thread messages
export const getThreadMessages = async (
  threadId: string,
  limit = 100
): Promise<AssistantMessage[]> => {
  const openai = getOpenAIClient();
  if (!openai) return [];

  try {
    const response = await openai.beta.threads.messages.list(threadId, {
      limit: limit,
      order: "desc", // Most recent first
    });

    return response.data
      .map((msg) => ({
        id: msg.id,
        content:
          msg.content[0]?.type === "text" ? msg.content[0].text.value : "",
        createdAt: new Date(msg.created_at * 1000),
        role: msg.role,
      }))
      .filter((msg) => msg.content.trim() !== "") // Filter out empty messages
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()); // Sort by time (oldest first)
  } catch (error) {
    console.error("Error fetching thread messages:", error);
    return [];
  }
};

// Detect if OpenAI services are available (for offline detection)
export const checkOpenAIAvailability = async (): Promise<boolean> => {
  if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
    console.warn("OpenAI API key is missing");
    return false;
  }

  try {
    // Use a simple HEAD request to check API availability
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch("https://api.openai.com/v1/models", {
      method: "HEAD",
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.warn("OpenAI API appears to be unavailable:", error);
    return false;
  }
};
