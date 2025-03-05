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
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OpenAI API key is missing");
    return null;
  }

  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true, // Note: In production, use server-side API calls instead
  });
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

    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);

    // Poll for completion
    while (
      !["completed", "failed", "cancelled", "expired"].includes(
        runStatus.status
      )
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);

      // Handle required actions (function calling)
      if (
        runStatus.status === "requires_action" &&
        runStatus.required_action?.submit_tool_outputs?.tool_calls
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

            if (onToolCall) {
              try {
                output = await onToolCall(functionName, functionArgs);
              } catch (error) {
                console.error(`Error executing tool ${functionName}:`, error);
              }
            }

            return {
              tool_call_id: toolCall.id,
              output: JSON.stringify(output),
            };
          })
        );

        // Submit the tool outputs back to the assistant
        await openai.beta.threads.runs.submitToolOutputs(threadId, run.id, {
          tool_outputs: toolOutputs,
        });
      }
    }

    if (runStatus.status !== "completed") {
      console.error(`Run ended with status: ${runStatus.status}`);
      return [];
    }

    // Get messages
    const messages = await openai.beta.threads.messages.list(threadId);

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
    const response = await openai.audio.transcriptions.create({
      file: new File([audioBlob], "audio.wav", { type: audioBlob.type }),
      model: "whisper-1",
    });

    return response.text;
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
