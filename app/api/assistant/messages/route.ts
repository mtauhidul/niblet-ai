// app/api/assistant/messages/route.ts
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(request: NextRequest) {
  try {
    // Get session
    const session = await getServerSession();

    if (!session?.user?.id) {
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

    // Get messages from OpenAI
    const messages = await openai.beta.threads.messages.list(threadId);

    // Format messages
    const formattedMessages = messages.data.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content[0].type === "text" ? msg.content[0].text.value : "",
      timestamp: new Date(msg.created_at * 1000),
    }));

    // Sort messages by timestamp
    formattedMessages.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    return NextResponse.json(formattedMessages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { message: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
