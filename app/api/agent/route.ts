import { NextResponse } from "next/server";
import { startAzureAgentChat, continueAzureAgentChat } from "@/lib/agent/azure-agent";

export async function POST(request: Request) {
  console.log("[API] Received request");

  try {
    const body = await request.json();
    console.log("[API] Request body:", JSON.stringify(body).substring(0, 200));

    const { message, agentType = "galnet", threadId, conversationId } = body;

    if (!message || typeof message !== "string") {
      console.log("[API] Invalid message");
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    console.log("[API] Processing message:", message.substring(0, 50), conversationId ? `(conv: ${conversationId})` : "");

    let response;
    if (threadId) {
      console.log("[API] Continuing chat with threadId:", threadId);
      response = await continueAzureAgentChat(message, agentType, threadId, conversationId);
    } else {
      console.log("[API] Starting new chat");
      response = await startAzureAgentChat(message, agentType, conversationId);
    }

    console.log("[API] Response received:", response.message?.substring(0, 100));
    console.log("[API] ThreadId:", response.threadId);

    return NextResponse.json(response);
  } catch (error) {
    console.error("[API] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Sorry, something went wrong. Please try again."
      },
      { status: 500 }
    );
  }
}
