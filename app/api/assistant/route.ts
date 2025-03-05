// src/app/api/assistant/route.js
import { NextResponse } from "next/server";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Map of personalities to their configurations
const personalities = {
  "best-friend": {
    name: "Nibble (Best Friend)",
    instructions:
      "You are Nibble, a friendly and supportive AI meal tracking assistant. Speak in a warm, casual tone like you're talking to a close friend. Use encouraging language, be empathetic, and occasionally add friendly emojis. Make the user feel comfortable sharing their food choices without judgment. Celebrate their wins and provide gentle guidance when they need it. Your goal is to help users track their meals, estimate calories, and provide nutritional guidance in a fun, approachable way.",
    temperature: 0.7,
  },
  "professional-coach": {
    name: "Nibble (Professional Coach)",
    instructions:
      "You are Nibble, a professional nutrition coach and meal tracking assistant. Maintain a supportive but data-driven approach. Speak with authority and precision, focusing on nutritional facts and measurable progress. Use a structured, clear communication style. Provide detailed nutritional breakdowns and specific, actionable advice based on the user's goals. Your responses should be informative, evidence-based, and focused on optimizing the user's nutrition for their specific goals.",
    temperature: 0.3,
  },
  "tough-love": {
    name: "Nibble (Tough Love)",
    instructions:
      "You are Nibble, a no-nonsense, tough-love meal tracking assistant. Be direct, straightforward, and push users to be accountable. Don't sugarcoat feedback - if they're making poor choices, tell them directly. Use motivational language that challenges them to do better. Focus on results and holding users to high standards. Your goal is to push users out of their comfort zone, call out excuses, and drive real behavioral change through direct accountability.",
    temperature: 0.5,
  },
};

// Create or update assistant
async function getOrCreateAssistant(
  personality: keyof typeof personalities = "best-friend"
) {
  const assistantId = process.env.ASSISTANT_ID;

  try {
    if (assistantId) {
      // Update existing assistant with the desired personality
      await openai.beta.assistants.update(assistantId, {
        name: personalities[personality].name,
        instructions: personalities[personality].instructions,
      });
      return assistantId;
    } else {
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
                    description:
                      "Type of meal (breakfast, lunch, dinner, snack)",
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
                  },
                },
                required: ["weight"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "get_meal_suggestions",
              description:
                "Get meal suggestions based on user preferences and remaining calories",
              parameters: {
                type: "object",
                properties: {
                  meal_type: {
                    type: "string",
                    description:
                      "Type of meal (breakfast, lunch, dinner, snack)",
                  },
                  max_calories: {
                    type: "number",
                    description: "Maximum calories for the meal",
                  },
                  dietary_restrictions: {
                    type: "array",
                    description: "Any dietary restrictions",
                    items: {
                      type: "string",
                    },
                  },
                },
                required: ["meal_type", "max_calories"],
              },
            },
          },
        ],
      });

      // In a real app, you'd want to save this to an environment variable or database
      return assistant.id;
    }
  } catch (error) {
    console.error("Error creating/updating assistant:", error);
    throw error;
  }
}

// Create a thread
export async function POST(request: Request) {
  try {
    const thread = await openai.beta.threads.create();
    return NextResponse.json({ threadId: thread.id });
  } catch (error) {
    console.error("Error creating thread:", error);
    return NextResponse.json(
      { error: "Failed to create thread" },
      { status: 500 }
    );
  }
}

// Send message and get response
export async function PUT(request: Request) {
  try {
    const {
      threadId,
      message,
      personality = "best-friend",
    }: {
      threadId: string;
      message: string;
      personality?: keyof typeof personalities;
    } = await request.json();

    if (!threadId || !message) {
      return NextResponse.json(
        { error: "Thread ID and message are required" },
        { status: 400 }
      );
    }

    // Get or create assistant with desired personality
    const assistantId = await getOrCreateAssistant(personality);

    // Add message to thread
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: message,
    });

    // Run the assistant
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
      temperature: personalities[personality].temperature,
    });

    // Poll for completion
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);

    // Wait for the run to complete (polling)
    // In a production app, you'd want to use a more sophisticated approach
    while (runStatus.status !== "completed" && runStatus.status !== "failed") {
      // Wait for 1 second
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check status again
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);

      // Handle function calls if needed
      if (runStatus.status === "requires_action") {
        const requiredActions =
          runStatus.required_action?.submit_tool_outputs?.tool_calls || [];
        const toolOutputs = [];

        for (const action of requiredActions) {
          const functionName = action.function.name;
          const functionArgs = JSON.parse(action.function.arguments);

          // Handle different function calls
          let output = {};

          if (functionName === "log_meal") {
            // In a real app, you would store this in a database
            output = {
              success: true,
              meal_id: `meal_${Date.now()}`,
              message: `Successfully logged ${functionArgs.meal_name} with ${functionArgs.calories} calories.`,
            };
          } else if (functionName === "log_weight") {
            // In a real app, you would store this in a database
            output = {
              success: true,
              message: `Successfully logged weight of ${functionArgs.weight} lbs.`,
            };
          } else if (functionName === "get_meal_suggestions") {
            // In a real app, you might fetch from a recipe database
            output = {
              suggestions: [
                {
                  name: "Grilled Chicken Salad",
                  calories: 350,
                  protein: 30,
                  carbs: 15,
                  fat: 20,
                },
                {
                  name: "Quinoa Bowl with Roasted Vegetables",
                  calories: 450,
                  protein: 15,
                  carbs: 65,
                  fat: 15,
                },
                {
                  name: "Greek Yogurt with Berries and Honey",
                  calories: 200,
                  protein: 15,
                  carbs: 25,
                  fat: 5,
                },
              ],
            };
          }

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

    // Get the messages after the run completes
    const messages = await openai.beta.threads.messages.list(threadId);

    // Get the assistant's response (should be the most recent assistant message)
    const assistantMessages = messages.data
      .filter((msg) => msg.role === "assistant")
      .map((msg) => ({
        id: msg.id,
        content: msg.content[0].type === "text" ? msg.content[0].text : "",
        createdAt: new Date(msg.created_at * 1000),
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Sort by most recent

    return NextResponse.json({
      response: assistantMessages[0] || null,
      assistantId,
      threadId,
    });
  } catch (error) {
    console.error("Error processing message:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}

// Transcribe audio
import { NextRequest } from "next/server";

export async function PATCH(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio");

    if (!audioFile) {
      return NextResponse.json(
        { error: "Audio file is required" },
        { status: 400 }
      );
    }

    // Convert to Blob
    const buffer = Buffer.from(await (audioFile as Blob).arrayBuffer());
    const file = new File([buffer], "audio.wav", {
      type: (audioFile as File).type,
    });

    // Transcribe with Whisper API
    const response = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
    });

    return NextResponse.json({ text: response.text });
  } catch (error) {
    console.error("Error transcribing audio:", error);
    return NextResponse.json(
      { error: "Failed to transcribe audio" },
      { status: 500 }
    );
  }
}
