import type { AgentChatResponse } from "./types";

// Configuration from environment
const apiBaseUrl = process.env.IGNITION_API_BASE_URL || "https://ignitionrag.com";
const agentId = process.env.IGNITION_AGENT_ID || "";
const apiKey = process.env.IGNITION_API_KEY || "";

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

  const url = `${apiBaseUrl}/api/agents/${agentId}/chat/stream`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query: message,
      sessionId: sid,
      history: history || [],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Ignition Agent] Error: ${response.status} - ${errorText}`);
    throw new Error(`IgnitionRAG API error: ${response.status} - ${errorText}`);
  }

  if (!response.body) {
    throw new Error("No response body from IgnitionRAG");
  }

  // Transform IgnitionRAG SSE format to our internal SSE format
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const streamStartTime = performance.now();
  let sentStart = false;

  let currentEvent = "";

  const transformStream = new TransformStream<Uint8Array, Uint8Array>({
    start(controller) {
      // Emit start event immediately with session ID
      sentStart = true;
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "start", responseId: sid })}\n\n`)
      );
    },
    transform(chunk, controller) {
      const text = decoder.decode(chunk, { stream: true });
      const lines = text.split("\n");

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data:")) {
          const rawData = line.slice(5).trim();

          switch (currentEvent) {
            case "chunk": {
              // Data is a raw JSON string, e.g. "Hello"
              if (rawData) {
                try {
                  const content = JSON.parse(rawData);
                  if (typeof content === "string") {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ type: "delta", content })}\n\n`)
                    );
                  } else if (content && typeof content === "object" && content.content) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ type: "delta", content: content.content })}\n\n`)
                    );
                  }
                } catch {
                  // Treat as raw text
                  if (rawData) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ type: "delta", content: rawData })}\n\n`)
                    );
                  }
                }
              }
              break;
            }
            case "sources": {
              try {
                const sources = JSON.parse(rawData);
                console.log(`[Ignition Agent] Sources received:`, Array.isArray(sources) ? sources.length : 0);
              } catch {
                // ignore
              }
              break;
            }
            case "tool_call": {
              try {
                const data = JSON.parse(rawData);
                console.log(`[Ignition Agent] Tool call: ${data.name}`);
              } catch {
                // ignore
              }
              break;
            }
            case "tool_result": {
              try {
                const data = JSON.parse(rawData);
                console.log(`[Ignition Agent] Tool result: ${data.name}`);
              } catch {
                // ignore
              }
              break;
            }
            case "done": {
              const durationMs = performance.now() - streamStartTime;
              console.log(`[Ignition Agent] Stream completed - Session: ${sid}, Duration: ${(durationMs / 1000).toFixed(2)}s`);
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: "done",
                  responseId: sid,
                  duration_ms: durationMs,
                })}\n\n`)
              );
              break;
            }
            case "error": {
              let errorMsg = "Unknown stream error";
              try {
                const data = JSON.parse(rawData);
                errorMsg = data.message || errorMsg;
              } catch {
                // ignore
              }
              console.error(`[Ignition Agent] Stream error:`, errorMsg);
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: "done",
                  responseId: sid,
                  error: errorMsg,
                })}\n\n`)
              );
              break;
            }
          }

          // Reset event after processing data
          currentEvent = "";
        }
      }
    },
  });

  return response.body.pipeThrough(transformStream);
}

/**
 * Start a non-streaming conversation with the IgnitionRAG agent.
 * Collects the full streamed response and returns it.
 */
export async function startIgnitionAgentChat(
  message: string,
  agentType: string,
  sessionId?: string
): Promise<AgentChatResponse> {
  const sid = sessionId || generateSessionId();

  console.log(`[Ignition Agent] Starting chat, session: ${sid}`);

  const url = `${apiBaseUrl}/api/agents/${agentId}/chat/stream`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query: message,
      sessionId: sid,
      history: [],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Ignition Agent] Error: ${response.status} - ${errorText}`);
    throw new Error(`IgnitionRAG API error: ${response.status} - ${errorText}`);
  }

  if (!response.body) {
    throw new Error("No response body from IgnitionRAG");
  }

  // Collect full response from stream
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullResponse = "";
  let currentEvent = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value, { stream: true });
    const lines = text.split("\n");

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith("data:")) {
        const rawData = line.slice(5).trim();
        if (currentEvent === "chunk" && rawData) {
          try {
            const parsed = JSON.parse(rawData);
            if (typeof parsed === "string") {
              fullResponse += parsed;
            } else if (parsed && typeof parsed === "object" && parsed.content) {
              fullResponse += parsed.content;
            }
          } catch {
            // Treat as raw text
            fullResponse += rawData;
          }
        }
        currentEvent = "";
      }
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
 * Uses sessionId and history for conversation context.
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
    if (!agentId || !apiKey) {
      return {
        isOnline: false,
        error: "IGNITION_AGENT_ID or IGNITION_API_KEY not configured",
      };
    }

    // List agents to check connectivity
    const response = await fetch(`${apiBaseUrl}/api/agents`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    const responseTime = performance.now() - startTime;

    if (!response.ok) {
      return {
        isOnline: false,
        responseTime,
        error: `API returned ${response.status}`,
      };
    }

    return {
      isOnline: true,
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
