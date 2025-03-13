// assistantService.ts optimizations to improve performance and implement streaming

import OpenAI from "openai";
import { createOrUpdateUserProfile } from "./firebase/models/user";
import runStateManager from "./runStateManager";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Only for client-side usage
});

// Define personalities
export type PersonalityKey =
  | "best-friend"
  | "professional-coach"
  | "tough-love";

// Define assistant instructions for each personality
const assistantInstructions: Record<PersonalityKey, string> = {
  "best-friend": "Be supportive and friendly.",
  "professional-coach": "Provide professional and structured advice.",
  "tough-love": "Be direct and honest, even if it's tough to hear.",
};

// Function to check OpenAI API availability
export const checkOpenAIAvailability = async (): Promise<boolean> => {
  try {
    // Simple lightweight request to check API connectivity
    const models = await openai.models.list();
    return models.data.length > 0;
  } catch (error) {
    console.error("OpenAI API availability check failed:", error);
    return false;
  }
};

// Create a thread
export const createThread = async (): Promise<string | null> => {
  try {
    const thread = await openai.beta.threads.create();
    console.log("Thread created:", thread.id);
    return thread.id;
  } catch (error) {
    console.error("Error creating thread:", error);
    return null;
  }
};

// Get or create assistant
export const getOrCreateAssistant = async (
  personality: PersonalityKey = "best-friend"
): Promise<string | null> => {
  try {
    console.log(`Creating assistant with ${personality} personality`);
    // Always create a new assistant to ensure the latest instructions are used
    const assistant = await openai.beta.assistants.create({
      name: `Niblet (${personality})`,
      instructions: assistantInstructions[personality],
      model: "gpt-4o-mini", // Using gpt-4o-mini for better performance
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
    console.log("Assistant created:", assistant.id);
    return assistant.id;
  } catch (error) {
    console.error("Error creating assistant:", error);
    return null;
  }
};

// Add a message to a thread
export const addMessageToThread = async (
  threadId: string,
  content: string,
  imageUrl?: string
): Promise<boolean> => {
  try {
    const messageContent: any[] = [
      {
        type: "text",
        text: content,
      },
    ];

    // Add image if provided
    if (imageUrl) {
      messageContent.push({
        type: "image_url",
        image_url: {
          url: imageUrl,
        },
      });
    }

    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: messageContent,
    });
    return true;
  } catch (error) {
    console.error("Error adding message to thread:", error);
    return false;
  }
};

// Interface for the handler function
interface ToolCallHandler {
  (toolName: string, toolArgs: any): Promise<{
    success: boolean;
    message: string;
    [key: string]: any;
  }>;
}

// Run the assistant with streaming support
export const runAssistantStreaming = async (
  threadId: string,
  assistantId: string,
  personality: PersonalityKey,
  callback: (chunk: { text: string; isComplete: boolean }) => void,
  toolHandler: ToolCallHandler
): Promise<void> => {
  try {
    // Set the run as active in the state manager
    runStateManager.setRunActive(threadId, "starting");

    // Start the run
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
    });

    runStateManager.setRunActive(threadId, run.id);

    // Polling mechanism
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    let isComplete = false;
    let accumulatedMessage = "";
    let fullMessageId = "";

    while (!isComplete) {
      // Check if the run requires action (function calling)
      if (
        runStatus.status === "requires_action" &&
        runStatus.required_action?.submit_tool_outputs
      ) {
        const toolCalls =
          runStatus.required_action.submit_tool_outputs.tool_calls;
        const toolOutputs = [];

        for (const toolCall of toolCalls) {
          try {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);

            // Handle the tool call
            const result = await toolHandler(functionName, functionArgs);

            toolOutputs.push({
              tool_call_id: toolCall.id,
              output: JSON.stringify(result),
            });
          } catch (error) {
            console.error(`Error processing tool call ${toolCall.id}:`, error);
            toolOutputs.push({
              tool_call_id: toolCall.id,
              output: JSON.stringify({
                success: false,
                message: "Error processing function call",
              }),
            });
          }
        }

        // Submit all tool outputs back to the assistant
        await openai.beta.threads.runs.submitToolOutputs(threadId, run.id, {
          tool_outputs: toolOutputs,
        });
      }

      // Check if run is completed
      else if (runStatus.status === "completed") {
        isComplete = true;

        // Get the latest message and stream it to the client
        const messages = await openai.beta.threads.messages.list(threadId, {
          limit: 1,
          order: "desc",
        });

        if (messages.data.length > 0) {
          const lastMessage = messages.data[0];
          fullMessageId = lastMessage.id;

          // Extract text content
          const content = lastMessage.content.filter((c) => c.type === "text");
          if (content.length > 0) {
            const text = content[0].text.value;
            accumulatedMessage = text;

            // Send the full message with complete flag
            callback({
              text: accumulatedMessage,
              isComplete: true,
            });
          }
        }
      }

      // Handle failed runs
      else if (["failed", "cancelled", "expired"].includes(runStatus.status)) {
        isComplete = true;
        callback({
          text: "Sorry, I encountered an issue. Please try again.",
          isComplete: true,
        });
        console.error(`Run ${run.id} ended with status: ${runStatus.status}`);
      }

      // For in-progress runs, attempt to stream partial content
      else if (runStatus.status === "in_progress") {
        try {
          // Try to get the latest message in the thread
          const messages = await openai.beta.threads.messages.list(threadId, {
            limit: 1,
            order: "desc",
          });

          // If there's a new message and it's from the assistant
          if (
            messages.data.length > 0 &&
            messages.data[0].role === "assistant"
          ) {
            const latestMessage = messages.data[0];

            // Only process if it's a new message or the message has been updated
            if (latestMessage.id !== fullMessageId) {
              fullMessageId = latestMessage.id;

              // Extract text content
              const content = latestMessage.content.filter(
                (c) => c.type === "text"
              );
              if (content.length > 0) {
                const text = content[0].text.value;

                // If this is new content, send it
                if (text !== accumulatedMessage) {
                  accumulatedMessage = text;
                  callback({
                    text: accumulatedMessage,
                    isComplete: false,
                  });
                }
              }
            }
          }
        } catch (error) {
          console.error("Error retrieving message during streaming:", error);
        }
      }

      // If run is still in progress, wait and then poll again
      if (!isComplete) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
      }
    }

    // Mark run as complete
    runStateManager.setRunInactive(threadId);
  } catch (error) {
    console.error("Error running assistant with streaming:", error);
    callback({
      text: "Sorry, I encountered an unexpected error. Please try again.",
      isComplete: true,
    });
    runStateManager.setRunInactive(threadId);
  }
};

// Run the assistant (original non-streaming version for backward compatibility)
export const runAssistant = async (
  threadId: string,
  assistantId: string,
  personality: PersonalityKey,
  toolHandler: ToolCallHandler
): Promise<Array<{
  id: string;
  content: string;
  createdAt: Date;
}> | null> => {
  try {
    const messages: Array<{
      id: string;
      content: string;
      createdAt: Date;
    }> = [];

    // Use the streaming version but collect all the messages
    await runAssistantStreaming(
      threadId,
      assistantId,
      personality,
      ({ text, isComplete }) => {
        if (isComplete) {
          messages.push({
            id: `msg-${Date.now()}`,
            content: text,
            createdAt: new Date(),
          });
        }
      },
      toolHandler
    );

    return messages.length > 0 ? messages : null;
  } catch (error) {
    console.error("Error running assistant:", error);
    return null;
  }
};

// Transcribe audio
export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  try {
    // Convert blob to file
    const file = new File([audioBlob], "audio.webm", {
      type: audioBlob.type,
    });

    // Use the Whisper API
    const response = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
    });

    return response.text;
  } catch (error) {
    console.error("Error transcribing audio:", error);
    throw error;
  }
};

// Update a user's assistant preference
export const updateUserAssistantPreference = async (
  userId: string,
  personality: PersonalityKey
): Promise<boolean> => {
  try {
    // Create a new assistant with the selected personality
    const assistantId = await getOrCreateAssistant(personality);
    if (!assistantId) return false;

    // Update the user profile
    await createOrUpdateUserProfile(userId, {
      assistantId,
      aiPersonality: personality,
    });

    return true;
  } catch (error) {
    console.error("Error updating user assistant preference:", error);
    return false;
  }
};
