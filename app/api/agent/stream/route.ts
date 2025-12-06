import { startAzureAgentChatStream } from "@/lib/agent/azure-agent";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, threadId, conversationId } = body;

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    console.log("[API Stream] Starting stream for message:", message.substring(0, 50), conversationId ? `(conv: ${conversationId})` : "");

    const stream = await startAzureAgentChatStream(
      message,
      "galnet",
      threadId,
      conversationId
    );

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("[API Stream] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
