// app/api/assistant/messages/route.ts
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * GET endpoint to retrieve messages from an OpenAI thread
 */
export async function GET(request: NextRequest) {
  try {
    // Get session token for authentication
    const token = await getToken({ req: request });

    if (!token?.sub) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get threadId from query parameters
    const url = new URL(request.url);
    const threadId = url.searchParams.get("threadId");

    if (!threadId) {
      return NextResponse.json(
        { message: "Thread ID is required" },
        { status: 400 }
      );
    }

    // Get limit parameter (optional)
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam) : undefined;

    // Fetch messages from OpenAI
    const messages = await openai.beta.threads.messages.list(threadId, {
      limit: limit,
      order: "asc", // Oldest first for conversation flow
    });

    // Format messages for the frontend
    const formattedMessages = messages.data.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content[0]?.type === "text" ? msg.content[0].text.value : "",
      timestamp: new Date(msg.created_at * 1000),
    }));

    return NextResponse.json(formattedMessages);
  } catch (error) {
    console.error("Error fetching messages:", error);

    // Handle specific error types
    if (error instanceof OpenAI.APIError) {
      if (error.status === 404) {
        return NextResponse.json(
          { message: "Thread not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { message: error.message || "OpenAI API error" },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { message: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
