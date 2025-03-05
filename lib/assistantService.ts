import OpenAI from "openai";

// Define personality types
type PersonalityKey = "best-friend" | "professional-coach" | "tough-love";

// Define assistant personality structure
interface Personality {
  name: string;
  instructions: string;
  temperature: number;
}

// Define OpenAI API response types
interface OpenAIRunStatus {
  status: string;
  id: string;
  required_action?: {
    submit_tool_outputs: {
      tool_calls: Array<{
        id: string;
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
  } | null;
}

interface Message {
  id: string;
  content: string;
  createdAt: Date;
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || "",
  dangerouslyAllowBrowser: true, // Warning: Avoid using API keys in the frontend
});

// Store assistant ID globally
let ASSISTANT_ID: string | null = null;

// Assistant personalities
const personalities: Record<PersonalityKey, Personality> = {
  "best-friend": {
    name: "Nibble (Best Friend)",
    instructions:
      "You are Nibble, a friendly and supportive AI meal tracking assistant...",
    temperature: 0.7,
  },
  "professional-coach": {
    name: "Nibble (Professional Coach)",
    instructions: "You are Nibble, a professional nutrition coach...",
    temperature: 0.3,
  },
  "tough-love": {
    name: "Nibble (Tough Love)",
    instructions:
      "You are Nibble, a no-nonsense, tough-love meal tracking assistant...",
    temperature: 0.5,
  },
};

// **2️⃣ Initialize or Get Assistant**
const getOrCreateAssistant = async (
  personality: PersonalityKey = "best-friend"
): Promise<string> => {
  if (ASSISTANT_ID) {
    await openai.beta.assistants.update(ASSISTANT_ID, {
      name: personalities[personality].name,
      instructions: personalities[personality].instructions,
      model: "gpt-4-turbo",
    });
    return ASSISTANT_ID;
  }

  try {
    const assistant = await openai.beta.assistants.create({
      name: personalities[personality].name,
      instructions: personalities[personality].instructions,
      model: "gpt-4-turbo",
    });

    ASSISTANT_ID = assistant.id;
    return assistant.id;
  } catch (error) {
    console.error("Error creating assistant:", error);
    throw error;
  }
};

// **3️⃣ Create a Thread for the User**
const createThread = async (): Promise<string> => {
  try {
    const thread = await openai.beta.threads.create();
    return thread.id;
  } catch (error) {
    console.error("Error creating thread:", error);
    throw error;
  }
};

// **4️⃣ Add Message to Thread**
const addMessageToThread = async (
  threadId: string,
  message: string
): Promise<void> => {
  try {
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: message,
    });
  } catch (error) {
    console.error("Error adding message to thread:", error);
    throw error;
  }
};

// **5️⃣ Run Assistant and Get Responses**
const runAssistant = async (
  threadId: string,
  assistantId: string,
  personality: PersonalityKey = "best-friend"
): Promise<Message[]> => {
  try {
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
      temperature: personalities[personality].temperature,
    });

    let runStatus: OpenAIRunStatus = await openai.beta.threads.runs.retrieve(
      threadId,
      run.id
    );

    // Poll for completion
    while (runStatus.status !== "completed" && runStatus.status !== "failed") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);

      // Handle required actions
      if (runStatus.status === "requires_action" && runStatus.required_action) {
        const toolOutputs =
          runStatus.required_action.submit_tool_outputs.tool_calls.map(
            (action) => ({
              tool_call_id: action.id,
              output: JSON.stringify({
                success: true,
                message: `Action completed for ${action.function.name}`,
              }),
            })
          );

        await openai.beta.threads.runs.submitToolOutputs(threadId, run.id, {
          tool_outputs: toolOutputs,
        });
      }
    }

    // Get messages
    const messages = await openai.beta.threads.messages.list(threadId);

    return messages.data
      .filter((msg) => msg.role === "assistant")
      .map((msg) => ({
        id: msg.id,
        content: typeof msg.content === "string" ? msg.content : "",
        createdAt: new Date(msg.created_at * 1000),
      }))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  } catch (error) {
    console.error("Error running assistant:", error);
    throw error;
  }
};

// **6️⃣ Transcribe Audio (Voice Chat Feature)**
const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  try {
    const response = await openai.audio.transcriptions.create({
      file: new File([audioBlob], "audio.wav", { type: audioBlob.type }),
      model: "whisper-1",
    });

    return response.text;
  } catch (error) {
    console.error("Error transcribing audio:", error);
    throw error;
  }
};

export {
  addMessageToThread,
  createThread,
  getOrCreateAssistant,
  runAssistant,
  transcribeAudio,
};
