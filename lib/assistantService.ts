// lib/assistantService.ts
import OpenAI from "openai";
import {
  getPersonalityInstructions,
  getTemperatureForPersonality,
} from "./configManager";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || "",
  dangerouslyAllowBrowser: true, // Only for client-side usage
});

export type PersonalityKey =
  | "best-friend"
  | "professional-coach"
  | "tough-love"
  | string;

// Create a thread
export async function createThread(): Promise<string | null> {
  try {
    const thread = await openai.beta.threads.create();
    return thread.id;
  } catch (error) {
    console.error("Error creating thread:", error);
    return null;
  }
}

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

// Get or create assistant with specific personality
export async function getOrCreateAssistant(
  personality: PersonalityKey = "best-friend"
): Promise<string | null> {
  try {
    // Get instructions from config manager
    const instructions = getPersonalityInstructions(personality);
    const temperature = getTemperatureForPersonality(personality);

    // Create a new assistant with the configured instructions and temperature
    const assistant = await openai.beta.assistants.create({
      name: `Niblet (${personality})`,
      instructions: instructions,
      model: "gpt-4o-mini", // Or your chosen model
      temperature: temperature,
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
        // Add other tools as needed
      ],
    });

    return assistant.id;
  } catch (error) {
    console.error("Error creating assistant:", error);
    return null;
  }
}

// Add a message to the thread
export async function addMessageToThread(
  threadId: string,
  content: string,
  imageUrl?: string
): Promise<boolean> {
  try {
    const messageContent = [];

    // Add text content
    if (content) {
      messageContent.push({
        type: "text" as const,
        text: content,
      });
    }

    // Add image content if provided
    if (imageUrl) {
      messageContent.push({
        type: "image_url" as const,
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
}

// Transcribe audio with Whisper API
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  try {
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");
    formData.append("model", "whisper-1");

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
      throw new Error(`Error transcribing audio: ${response.statusText}`);
    }

    const result = await response.json();
    return result.text;
  } catch (error) {
    console.error("Error transcribing audio:", error);
    return "";
  }
}

// Interface for handling tool calls
interface ToolCallHandler {
  (toolName: string, toolArgs: any): Promise<any>;
}

// Run the assistant and handle any tool calls
export async function runAssistant(
  threadId: string,
  assistantId: string,
  personality: PersonalityKey,
  toolCallHandler: ToolCallHandler
): Promise<Array<{ id: string; content: string; createdAt: Date }> | null> {
  try {
    // Get temperature from config manager
    const temperature = getTemperatureForPersonality(personality);

    // Run the assistant
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
      temperature: temperature,
    });

    // Poll for completion
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);

    // Wait for the run to complete (polling)
    while (
      !["completed", "failed", "cancelled", "expired"].includes(
        runStatus.status
      )
    ) {
      // Wait for 1 second
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check status again
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);

      // Handle function calls if needed
      if (
        runStatus.status === "requires_action" &&
        runStatus.required_action?.submit_tool_outputs
      ) {
        const requiredActions =
          runStatus.required_action.submit_tool_outputs.tool_calls;
        const toolOutputs = [];

        for (const action of requiredActions) {
          const functionName = action.function.name;
          const functionArgs = JSON.parse(action.function.arguments);

          // Use the passed handler to process tool calls
          const output = await toolCallHandler(functionName, functionArgs);

          toolOutputs.push({
            tool_call_id: action.id,
            output: JSON.stringify(output),
          });
        }

        // Submit tool outputs back to the assistant
        await openai.beta.threads.runs.submitToolOutputs(threadId, run.id, {
          tool_outputs: toolOutputs,
        });
      }
    }

    // Check if run completed successfully
    if (runStatus.status !== "completed") {
      throw new Error(`Run ended with status: ${runStatus.status}`);
    }

    // Get the messages after the run completes
    const messages = await openai.beta.threads.messages.list(threadId);

    // Process assistant messages
    const assistantMessages = messages.data
      .filter((msg) => msg.role === "assistant")
      .map((msg) => ({
        id: msg.id,
        content:
          msg.content[0]?.type === "text" ? msg.content[0].text.value : "",
        createdAt: new Date(msg.created_at * 1000),
      }))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return assistantMessages;
  } catch (error) {
    console.error("Error running assistant:", error);
    return null;
  }
}

// Streaming version of runAssistant
export async function runAssistantStreaming(
  threadId: string,
  assistantId: string,
  personality: PersonalityKey,
  onUpdate: (update: { text: string; isComplete: boolean }) => void,
  toolCallHandler: ToolCallHandler
): Promise<void> {
  try {
    // Get temperature from config manager
    const temperature = getTemperatureForPersonality(personality);

    // Run the assistant
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
      temperature: temperature,
    });

    // Variable to track the accumulated text
    let accumulatedText = "";

    // Poll for completion while providing updates
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);

    // Function to fetch latest messages and update callback
    const updateWithLatestMessages = async () => {
      // Get the messages after the run completes
      const messages = await openai.beta.threads.messages.list(threadId);

      // Get the most recent assistant message
      const latestMessage = messages.data
        .filter((msg) => msg.role === "assistant")
        .sort((a, b) => b.created_at - a.created_at)[0];

      if (latestMessage && latestMessage.content[0]?.type === "text") {
        const text = latestMessage.content[0].text.value;
        if (text !== accumulatedText) {
          accumulatedText = text;
          onUpdate({ text, isComplete: false });
        }
      }
    };

    // Wait for the run to complete (polling)
    while (
      !["completed", "failed", "cancelled", "expired"].includes(
        runStatus.status
      )
    ) {
      // Periodically fetch the current state to simulate streaming
      await updateWithLatestMessages();

      // Wait for a short interval
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check status again
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);

      // Handle function calls if needed
      if (
        runStatus.status === "requires_action" &&
        runStatus.required_action?.submit_tool_outputs
      ) {
        const requiredActions =
          runStatus.required_action.submit_tool_outputs.tool_calls;
        const toolOutputs = [];

        for (const action of requiredActions) {
          const functionName = action.function.name;
          const functionArgs = JSON.parse(action.function.arguments);

          // Use the passed handler to process tool calls
          const output = await toolCallHandler(functionName, functionArgs);

          toolOutputs.push({
            tool_call_id: action.id,
            output: JSON.stringify(output),
          });
        }

        // Submit tool outputs back to the assistant
        await openai.beta.threads.runs.submitToolOutputs(threadId, run.id, {
          tool_outputs: toolOutputs,
        });
      }
    }

    // Final update after completion
    if (runStatus.status === "completed") {
      // Get final message
      const messages = await openai.beta.threads.messages.list(threadId);
      const latestMessage = messages.data
        .filter((msg) => msg.role === "assistant")
        .sort((a, b) => b.created_at - a.created_at)[0];

      if (latestMessage && latestMessage.content[0]?.type === "text") {
        const finalText = latestMessage.content[0].text.value;
        onUpdate({ text: finalText, isComplete: true });
      } else {
        onUpdate({ text: accumulatedText, isComplete: true });
      }
    } else {
      throw new Error(`Run ended with status: ${runStatus.status}`);
    }
  } catch (error) {
    console.error("Error running assistant with streaming:", error);
    onUpdate({
      text: "I'm sorry, I experienced an error while processing your request. Please try again.",
      isComplete: true,
    });
  }
}
