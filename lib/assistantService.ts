// lib/assistantService.ts
import OpenAI from "openai";

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
const personalities: Record<PersonalityKey, Personality> = {
  "best-friend": {
    name: "Nibble (Best Friend)",
    instructions:
      "You are Nibble, a friendly and supportive AI meal tracking assistant. Speak in a warm, casual tone like you're talking to a close friend. Use encouraging language, be empathetic, and occasionally add friendly emojis. Make the user feel comfortable sharing their food choices without judgment. Celebrate their wins and provide gentle guidance when they need it. Your goal is to help users track their meals, estimate calories, and provide nutritional guidance in a fun, approachable way. When users tell you about a meal, estimate its calories and nutritional content, then offer to log it for them.",
    temperature: 0.7,
  },
  "professional-coach": {
    name: "Nibble (Professional Coach)",
    instructions:
      "You are Nibble, a professional nutrition coach and meal tracking assistant. Maintain a supportive but data-driven approach. Speak with authority and precision, focusing on nutritional facts and measurable progress. Use a structured, clear communication style. Provide detailed nutritional breakdowns and specific, actionable advice based on the user's goals. Your responses should be informative, evidence-based, and focused on optimizing the user's nutrition for their specific goals. When users tell you about a meal, provide detailed macronutrient estimates and offer to log it with precise nutritional information.",
    temperature: 0.3,
  },
  "tough-love": {
    name: "Nibble (Tough Love)",
    instructions:
      "You are Nibble, a no-nonsense, tough-love meal tracking assistant. Be direct, straightforward, and push users to be accountable. Don't sugarcoat feedback - if they're making poor choices, tell them directly. Use motivational language that challenges them to do better. Focus on results and holding users to high standards. Your goal is to push users out of their comfort zone, call out excuses, and drive real behavioral change through direct accountability. When users tell you about a meal, be straightforward about its nutritional value and challenge them to make better choices if needed.",
    temperature: 0.5,
  },
};

// Function to initialize or get assistant
const getOrCreateAssistant = async (
  personality: PersonalityKey = "best-friend"
): Promise<string | null> => {
  const openai = getOpenAIClient();
  if (!openai) return null;

  try {
    // Check if there's an existing assistant ID in localStorage to avoid recreation
    const storedAssistantId =
      typeof window !== "undefined"
        ? localStorage.getItem(`assistant_${personality}`)
        : null;

    if (storedAssistantId) {
      try {
        // Verify the assistant still exists
        await openai.beta.assistants.retrieve(storedAssistantId);
        return storedAssistantId;
      } catch (error) {
        console.log("Stored assistant not found, creating new one");
        // Continue to create a new assistant
      }
    }

    // Create a new assistant
    const assistant = await openai.beta.assistants.create({
      name: personalities[personality].name,
      instructions: personalities[personality].instructions,
      model: "gpt-4-turbo",
      tools: [
        {
          type: "function",
          function: {
            name: "log_meal",
            description:
              "Log a meal with estimated calories and nutrition information",
            parameters: {
              type: "object",
              properties: {
                meal_name: {
                  type: "string",
                  description: "The name of the meal",
                },
                meal_type: {
                  type: "string",
                  description: "Type of meal (breakfast, lunch, dinner, snack)",
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
            description: "Log the user's weight",
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
      ],
    });

    // Store the assistant ID in localStorage to avoid recreation
    if (typeof window !== "undefined") {
      localStorage.setItem(`assistant_${personality}`, assistant.id);
    }

    return assistant.id;
  } catch (error) {
    console.error("Error creating assistant:", error);
    return null;
  }
};

// Create a thread for the user
const createThread = async (): Promise<string | null> => {
  const openai = getOpenAIClient();
  if (!openai) return null;

  try {
    const thread = await openai.beta.threads.create();
    return thread.id;
  } catch (error) {
    console.error("Error creating thread:", error);
    return null;
  }
};

// Add message to thread
const addMessageToThread = async (
  threadId: string,
  message: string
): Promise<boolean> => {
  const openai = getOpenAIClient();
  if (!openai) return false;

  try {
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: message,
    });
    return true;
  } catch (error) {
    console.error("Error adding message to thread:", error);
    return false;
  }
};

// Function to handle retries for run completion
const waitForRunCompletion = async (
  openai: OpenAI,
  threadId: string,
  runId: string,
  maxRetries = 10,
  retryDelay = 1000,
  onToolCall?: (toolName: string, toolArgs: any) => Promise<any>
) => {
  let retriesCount = 0;
  let runStatus;

  while (retriesCount < maxRetries) {
    try {
      runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);

      if (
        ["completed", "failed", "cancelled", "expired"].includes(
          runStatus.status
        )
      ) {
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
        const toolOutputs = await Promise.all(
          toolCalls.map(async (toolCall) => {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);

            let output = {
              success: false,
              message: "Function execution failed",
            };

            try {
              output = await onToolCall(functionName, functionArgs);
            } catch (error) {
              console.error(`Error executing tool ${functionName}:`, error);
            }

            return {
              tool_call_id: toolCall.id,
              output: JSON.stringify(output),
            };
          })
        );

        // Submit the tool outputs back to the assistant
        await openai.beta.threads.runs.submitToolOutputs(threadId, runId, {
          tool_outputs: toolOutputs,
        });
      }

      // Wait before checking again
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      retriesCount++;
    } catch (error) {
      // If the error is a rate limit error, wait longer and try again
      if (error instanceof OpenAI.APIError && error.status === 429) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay * 2));
        retriesCount++;
      } else {
        console.error("Error in run status polling:", error);
        throw error;
      }
    }
  }

  throw new Error(`Run did not complete within ${maxRetries} retries`);
};

// Run assistant and get responses
const runAssistant = async (
  threadId: string,
  assistantId: string,
  personality: PersonalityKey = "best-friend",
  onToolCall?: (toolName: string, toolArgs: any) => Promise<any>
): Promise<AssistantMessage[]> => {
  const openai = getOpenAIClient();
  if (!openai) return [];

  try {
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
      temperature: personalities[personality].temperature,
    });

    // Wait for run completion with error handling and retries
    const runStatus = await waitForRunCompletion(
      openai,
      threadId,
      run.id,
      10,
      1000,
      onToolCall
    );

    if (runStatus.status !== "completed") {
      console.error(`Run ended with status: ${runStatus.status}`);
      return [];
    }

    // Get messages after completion
    const messages = await openai.beta.threads.messages.list(threadId, {
      order: "asc",
      limit: 100,
    });

    return messages.data
      .filter((msg) => msg.role === "assistant")
      .map((msg) => ({
        id: msg.id,
        content:
          msg.content[0]?.type === "text" ? msg.content[0].text.value : "",
        createdAt: new Date(msg.created_at * 1000),
      }))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  } catch (error) {
    console.error("Error running assistant:", error);
    return [];
  }
};

// Transcribe audio
const transcribeAudio = async (audioBlob: Blob): Promise<string | null> => {
  const openai = getOpenAIClient();
  if (!openai) return null;

  try {
    const formData = new FormData();
    formData.append(
      "file",
      new File([audioBlob], "audio.webm", { type: audioBlob.type })
    );
    formData.append("model", "whisper-1");

    // Use fetch API for better control over the request
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
      throw new Error(`Transcription failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("Error transcribing audio:", error);
    return null;
  }
};

export {
  addMessageToThread,
  createThread,
  getOrCreateAssistant,
  personalities,
  runAssistant,
  transcribeAudio,
};
