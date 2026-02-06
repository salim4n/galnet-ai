import { IgnitionAI } from "@ignitionai/sdk";
import type { AgentChatResponse } from "./types";

const agentId = process.env.IGNITION_AGENT_ID || "";

const client = new IgnitionAI({
  apiKey: process.env.IGNITION_API_KEY,
  baseURL: process.env.IGNITION_BASE_URL || process.env.IGNITION_API_BASE_URL || undefined,
});

// Generate a unique session ID
function generateSessionId(): string {
  return `session_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Start a streaming conversation with the IgnitionRAG agent.
 * Returns a ReadableStream that emits SSE-formatted events in our internal format.
 */
export async function startIgnitionAgentChatStream(
  message: string,
  agentType: string,
  sessionId?: string,
  history?: Array<{ role: "user" | "assistant"; content: string }>
): Promise<ReadableStream<Uint8Array>> {
  const sid = sessionId || generateSessionId();

  console.log(`[Ignition Agent] Starting streaming chat, session: ${sid}`);

  const encoder = new TextEncoder();
  const streamStartTime = performance.now();

  const sdkStream = client.agentChat.stream(agentId, {
    query: message,
    sessionId: sid,
  });

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      // Emit start event
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "start", responseId: sid })}\n\n`)
      );

      try {
        for await (const event of sdkStream) {
          switch (event.type) {
            case "chunk": {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "delta", content: event.content })}\n\n`)
              );
              break;
            }
            case "sources": {
              console.log(`[Ignition Agent] Sources received:`, event.sources?.length ?? 0);
              break;
            }
            case "tool_call": {
              console.log(`[Ignition Agent] Tool call: ${event.name}`);
              break;
            }
            case "tool_result": {
              console.log(`[Ignition Agent] Tool result: ${event.name}`);
              break;
            }
          }
        }

        const durationMs = performance.now() - streamStartTime;
        console.log(`[Ignition Agent] Stream completed - Session: ${sid}, Duration: ${(durationMs / 1000).toFixed(2)}s`);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: "done",
            responseId: sid,
            duration_ms: durationMs,
          })}\n\n`)
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown stream error";
        console.error(`[Ignition Agent] Stream error:`, errorMsg);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: "done",
            responseId: sid,
            error: errorMsg,
          })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });
}

/**
 * Start a non-streaming conversation with the IgnitionRAG agent.
 * Uses the SDK stream and collects the full response.
 */
export async function startIgnitionAgentChat(
  message: string,
  agentType: string,
  sessionId?: string
): Promise<AgentChatResponse> {
  const sid = sessionId || generateSessionId();

  console.log(`[Ignition Agent] Starting chat, session: ${sid}`);

  const stream = client.agentChat.stream(agentId, {
    query: message,
    sessionId: sid,
  });

  let fullResponse = "";
  for await (const event of stream) {
    if (event.type === "chunk") {
      fullResponse += event.content;
    }
  }

  console.log(`[Ignition Agent] Response: ${fullResponse.substring(0, 100)}...`);

  return {
    message: fullResponse,
    threadId: sid,
    agentType,
    suggestions: [],
    conversationHistory: [
      { role: "user" as const, content: message },
      { role: "assistant" as const, content: fullResponse },
    ],
  };
}

/**
 * Continue an existing conversation with the IgnitionRAG agent.
 * Uses sessionId for conversation context.
 */
export async function continueIgnitionAgentChat(
  message: string,
  agentType: string,
  sessionId: string,
  history?: Array<{ role: "user" | "assistant"; content: string }>
): Promise<AgentChatResponse> {
  return startIgnitionAgentChat(message, agentType, sessionId);
}

/**
 * Check IgnitionRAG service health
 */
export async function checkIgnitionHealth(): Promise<{
  isOnline: boolean;
  responseTime?: number;
  error?: string;
}> {
  const startTime = performance.now();

  try {
    if (!agentId || !process.env.IGNITION_API_KEY) {
      return {
        isOnline: false,
        error: "IGNITION_AGENT_ID or IGNITION_API_KEY not configured",
      };
    }

    const agent = await client.agents.get(agentId);
    const responseTime = performance.now() - startTime;

    return {
      isOnline: !!agent,
      responseTime,
    };
  } catch (error) {
    const responseTime = performance.now() - startTime;
    return {
      isOnline: false,
      responseTime,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
