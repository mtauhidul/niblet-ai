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
    // Check if there's an existing assistant ID in localStorage to avoid recreation
    const storedAssistantId =
      typeof window !== "undefined"
        ? localStorage.getItem(`assistant_${personality}`)
        : null;

    if (storedAssistantId) {
      try {
        // Verify the assistant still exists
        await retry(() => openai.beta.assistants.retrieve(storedAssistantId));
        console.log(`Retrieved existing assistant: ${storedAssistantId}`);
        return storedAssistantId;
      } catch (error) {
        console.log("Stored assistant not found, creating new one");
        // Continue to create a new assistant
      }
    }

    // Create a new assistant with retry
    const assistant = await retry(() =>
      openai.beta.assistants.create({
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
      })
    );

    // Store the assistant ID in localStorage to avoid recreation
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

// Add message to thread with retry
// Update this function in assistantService.ts to properly handle images

// Add message to thread with retry and image support
export const addMessageToThread = async (
  threadId: string,
  message: string,
  imageUrl?: string
): Promise<boolean> => {
  const openai = getOpenAIClient();
  if (!openai) return false;

  try {
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
    }

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

        console.log("Tool outputs submitted, continuing run");
      }

      // Wait before checking again
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      retriesCount++;
    } catch (error) {
      // If the error is a rate limit error, wait longer and try again
      if (error instanceof OpenAI.APIError && error.status === 429) {
        console.warn("Rate limit reached, waiting longer before retry");
        await new Promise((resolve) => setTimeout(resolve, retryDelay * 5));
        retriesCount++;
      } else {
        console.error("Error in run status polling:", error);
        throw error;
      }
    }
  }

  throw new Error(`Run did not complete within ${maxRetries} retries`);
};

// Run assistant and get responses with improved error handling
export const runAssistant = async (
  threadId: string,
  assistantId: string,
  personality: PersonalityKey = "best-friend",
  onToolCall?: (toolName: string, toolArgs: any) => Promise<any>
): Promise<AssistantMessage[]> => {
  const openai = getOpenAIClient();
  if (!openai) return [];

  try {
    console.log(`Running assistant ${assistantId} on thread ${threadId}`);

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
      throw new Error(`Run failed with status: ${runStatus.status}`);
    }

    console.log("Run completed successfully, fetching messages");

    // Get messages after completion
    const messages = await retry(() =>
      openai.beta.threads.messages.list(threadId, {
        order: "asc",
        limit: 100,
      })
    );

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
