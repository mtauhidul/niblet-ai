// app/api/assistant/initialize/route.ts
import {
  createThread,
  getOrCreateAssistant,
  runAssistant,
} from "@/lib/assistantService";
import { createOrUpdateUserProfile } from "@/lib/firebase/models/user";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

/**
 * Initialize a new chat thread with an optional personality setting
 * Creates both the thread and assistant and returns a welcome message
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const token = await getToken({ req: request });
    if (!token?.sub) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get personality from request
    const { personality = "best-friend" } = await request.json();

    // Create new thread
    const threadId = await createThread();
    if (!threadId) {
      return NextResponse.json(
        { error: "Failed to create thread" },
        { status: 500 }
      );
    }

    // Create or get assistant with specified personality
    const assistantId = await getOrCreateAssistant(personality);
    if (!assistantId) {
      return NextResponse.json(
        { error: "Failed to create assistant" },
        { status: 500 }
      );
    }

    // Save thread and assistant IDs to user profile
    await createOrUpdateUserProfile(token.sub, {
      threadId,
      assistantId,
      aiPersonality: personality,
    });

    // Get a welcome message by running the assistant
    const assistantMessages = await runAssistant(
      threadId,
      assistantId,
      personality,
      async (toolName, toolArgs) => {
        // Simple tool handling for initialization
        return {
          success: true,
          message: "Operation completed during initialization",
        };
      }
    );

    // Prepare response with welcome message
    let welcomeMessage = null;
    if (assistantMessages && assistantMessages.length > 0) {
      welcomeMessage = assistantMessages[assistantMessages.length - 1];
    }

    return NextResponse.json({
      threadId,
      assistantId,
      personality,
      welcomeMessage: welcomeMessage
        ? {
            id: welcomeMessage.id,
            content: welcomeMessage.content,
            timestamp: welcomeMessage.createdAt.toISOString(),
          }
        : {
            id: "welcome",
            content: "Hi, I'm Niblet! How can I help you today?",
            timestamp: new Date().toISOString(),
          },
    });
  } catch (error) {
    console.error("Error initializing chat:", error);
    return NextResponse.json(
      { error: "Failed to initialize chat" },
      { status: 500 }
    );
  }
}
