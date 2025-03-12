// app/api/assistant/route.ts
import { createMeal } from "@/lib/firebase/models/meal";
import { logWeight } from "@/lib/firebase/models/weightLog";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Map of personalities to their configurations
const personalities = {
  "best-friend": {
    name: "Niblet (Best Friend)",
    instructions:
      "You are Niblet, a friendly and supportive AI meal tracking assistant. Speak in a warm, casual tone like you're talking to a close friend. Use encouraging language, be empathetic, and occasionally add friendly emojis. Make the user feel comfortable sharing their food choices without judgment. Celebrate their wins and provide gentle guidance when they need it. Your goal is to help users track their meals, estimate calories, and provide nutritional guidance in a fun, approachable way. When users tell you about a meal, estimate its calories and nutritional content, then offer to log it for them.",
    temperature: 0.7,
  },
  "professional-coach": {
    name: "Niblet (Professional Coach)",
    instructions:
      "You are Niblet, a professional nutrition coach and meal tracking assistant. Maintain a supportive but data-driven approach. Speak with authority and precision, focusing on nutritional facts and measurable progress. Use a structured, clear communication style. Provide detailed nutritional breakdowns and specific, actionable advice based on the user's goals. Your responses should be informative, evidence-based, and focused on optimizing the user's nutrition for their specific goals. When users tell you about a meal, provide detailed macronutrient estimates and offer to log it with precise nutritional information.",
    temperature: 0.3,
  },
  "tough-love": {
    name: "Niblet (Tough Love)",
    instructions:
      "You are Niblet, a no-nonsense, tough-love meal tracking assistant. Be direct, straightforward, and push users to be accountable. Don't sugarcoat feedback - if they're making poor choices, tell them directly. Use motivational language that challenges them to do better. Focus on results and holding users to high standards. Your goal is to push users out of their comfort zone, call out excuses, and drive real behavioral change through direct accountability. When users tell you about a meal, be straightforward about its nutritional value and challenge them to make better choices if needed.",
    temperature: 0.5,
  },
};

type PersonalityKey = keyof typeof personalities;

// Get or create assistant
async function getOrCreateAssistant(
  personality: PersonalityKey = "best-friend"
) {
  try {
    // Create a new assistant
    const assistant = await openai.beta.assistants.create({
      name: personalities[personality].name,
      instructions: personalities[personality].instructions,
      model: "gpt-4o-mini",
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
    throw error;
  }
}

// Create a thread
export async function POST(request: NextRequest) {
  // Verify user is authenticated
  const token = await getToken({ req: request });
  if (!token?.sub) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get personality from request if available
    let personality: PersonalityKey = "best-friend";
    try {
      const { personality: reqPersonality } = await request.json();
      if (reqPersonality && reqPersonality in personalities) {
        personality = reqPersonality as PersonalityKey;
      }
    } catch (e) {
      // Use default personality if no valid JSON or personality specified
    }

    // Get or create assistant with personality
    const assistantId = await getOrCreateAssistant(personality);

    // Create thread
    const thread = await openai.beta.threads.create();

    return NextResponse.json({
      threadId: thread.id,
      assistantId: assistantId,
    });
  } catch (error) {
    console.error("Error creating thread:", error);
    return NextResponse.json(
      { error: "Failed to create thread" },
      { status: 500 }
    );
  }
}

// Send message and get response
export async function PUT(request: NextRequest) {
  // Verify user is authenticated
  const token = await getToken({ req: request });
  if (!token?.sub) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      threadId,
      message,
      personality = "best-friend",
    }: {
      threadId: string;
      message: string;
      personality?: PersonalityKey;
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

          // Handle different function calls
          let output = {};

          if (functionName === "log_meal") {
            try {
              // Create a meal document in Firestore
              const mealData = {
                userId: token.sub,
                name: functionArgs.meal_name,
                mealType: functionArgs.meal_type,
                calories: functionArgs.calories,
                protein: functionArgs.protein,
                carbs: functionArgs.carbs,
                fat: functionArgs.fat,
                items: functionArgs.items || [],
                date: new Date(),
              };

              const meal = await createMeal(mealData);

              output = {
                success: true,
                meal_id: meal.id,
                message: `Successfully logged ${functionArgs.meal_name} with ${functionArgs.calories} calories.`,
              };
            } catch (error) {
              console.error("Error logging meal:", error);
              output = {
                success: false,
                message: "Failed to log meal. Please try again.",
              };
            }
          } else if (functionName === "log_weight") {
            try {
              // Log weight
              const weightData = await logWeight(
                token.sub,
                functionArgs.weight,
                functionArgs.date ? new Date(functionArgs.date) : undefined
              );

              output = {
                success: true,
                message: `Successfully logged weight of ${functionArgs.weight} lbs.`,
              };
            } catch (error) {
              console.error("Error logging weight:", error);
              output = {
                success: false,
                message: "Failed to log weight. Please try again.",
              };
            }
          } else if (functionName === "get_nutrition_info") {
            // In a real app, you would call a nutrition API here
            // For this example, we'll simulate a response
            output = {
              success: true,
              message: `Retrieved nutrition info for ${functionArgs.food_item}`,
              nutrition: {
                calories: Math.floor(Math.random() * 500) + 100,
                protein: Math.floor(Math.random() * 30) + 5,
                carbs: Math.floor(Math.random() * 50) + 10,
                fat: Math.floor(Math.random() * 20) + 2,
              },
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

    // Check if run completed successfully
    if (runStatus.status !== "completed") {
      return NextResponse.json(
        { error: `Run ended with status: ${runStatus.status}` },
        { status: 500 }
      );
    }

    // Get the messages after the run completes
    const messages = await openai.beta.threads.messages.list(threadId);

    // Get the assistant's response (should be the most recent assistant message)
    const assistantMessages = messages.data
      .filter((msg) => msg.role === "assistant")
      .map((msg) => ({
        id: msg.id,
        content:
          msg.content[0]?.type === "text" ? msg.content[0].text.value : "",
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
export async function PATCH(request: NextRequest) {
  // Verify user is authenticated
  const token = await getToken({ req: request });
  if (!token?.sub) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio");

    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json(
        { error: "Audio file is required" },
        { status: 400 }
      );
    }

    // Convert to Blob
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const file = new File([buffer], "audio.webm", {
      type: audioFile.type,
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
