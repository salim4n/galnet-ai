import { DefaultAzureCredential } from "@azure/identity";
import { trace, SpanStatusCode, context, propagation } from "@opentelemetry/api";
import type { AgentChatResponse } from "./types";

// Configuration from environment
const projectEndpoint = process.env.AZURE_EXISTING_AIPROJECT_ENDPOINT || "";
const agentName = process.env.AZURE_EXISTING_AGENT_ID?.split(":")[0] || "galnet";
const apiVersion = "2025-11-15-preview";

// OpenTelemetry tracer
const tracer = trace.getTracer("galnet-ai", "1.0.0");

// Cached token
let cachedToken: { token: string; expiresAt: number } | null = null;
const credential = new DefaultAzureCredential();

/**
 * Get a valid Azure token, refreshing if needed
 */
async function getToken(): Promise<string> {
  return tracer.startActiveSpan("getToken", async (span) => {
    try {
      const now = Date.now();
      // Refresh token 5 minutes before expiry
      if (cachedToken && cachedToken.expiresAt > now + 5 * 60 * 1000) {
        span.setAttribute("token.cached", true);
        span.end();
        return cachedToken.token;
      }

      span.setAttribute("token.cached", false);
      const tokenResponse = await credential.getToken("https://ai.azure.com/.default");
      if (!tokenResponse) {
        throw new Error("Failed to get Azure token");
      }

      cachedToken = {
        token: tokenResponse.token,
        expiresAt: tokenResponse.expiresOnTimestamp
      };

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      return cachedToken.token;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
      span.end();
      throw error;
    }
  });
}

/**
 * Build the Responses API URL
 */
function getResponsesUrl(): string {
  // Extract base URL from project endpoint
  const baseUrl = projectEndpoint.replace(/\/api\/projects\/[^/]+$/, "");
  const projectName = projectEndpoint.match(/\/api\/projects\/([^/]+)$/)?.[1] || "galnet";
  return `${baseUrl}/api/projects/${projectName}/openai/responses?api-version=${apiVersion}`;
}

/**
 * Extract text content from Responses API output
 */
function extractTextFromResponse(data: ResponsesApiResponse): string {
  if (!data.output || !Array.isArray(data.output)) {
    return "";
  }

  // Find message output with text content
  for (const item of data.output) {
    if (item.type === "message" && item.content) {
      for (const content of item.content) {
        if (content.type === "output_text" && content.text) {
          return content.text;
        }
      }
    }
  }

  return "";
}

// Types for Responses API
interface ResponsesApiResponse {
  id: string;
  status: string;
  output?: Array<{
    type: string;
    content?: Array<{
      type: string;
      text?: string;
    }>;
  }>;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  error?: {
    message: string;
    code: string;
  };
}

// Types for streaming events
interface StreamEvent {
  type: string;
  delta?: string;
  response_id?: string;
  item_id?: string;
  content_index?: number;
  output_index?: number;
  response?: ResponsesApiResponse;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

// Generate a unique conversation ID
function generateConversationId(): string {
  return `conv_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Start a streaming conversation with the Azure AI Foundry agent
 * Returns a ReadableStream that emits SSE-formatted events
 */
export async function startAzureAgentChatStream(
  message: string,
  agentType: string,
  previousResponseId?: string,
  conversationId?: string
): Promise<ReadableStream<Uint8Array>> {
  return tracer.startActiveSpan("startAzureAgentChatStream", async (span) => {
    // Use provided conversation ID or generate a new one
    const convId = conversationId || generateConversationId();

    span.setAttribute("agent.name", agentName);
    span.setAttribute("agent.type", agentType);
    span.setAttribute("message.length", message.length);
    span.setAttribute("conversation.continued", !!previousResponseId);
    span.setAttribute("conversation.id", convId);

    try {
      const token = await getToken();
      const url = getResponsesUrl();

      console.log(`[Azure Agent] Starting streaming chat with agent: ${agentName}`);

      const body: Record<string, unknown> = {
        agent: { type: "agent_reference", name: agentName },
        input: message,
        stream: true
      };

      if (previousResponseId) {
        body.previous_response_id = previousResponseId;
        span.setAttribute("previous_response_id", previousResponseId);
      }

      const fetchSpan = tracer.startSpan("fetch.responses.stream", {}, context.active());
      fetchSpan.setAttribute("http.method", "POST");
      fetchSpan.setAttribute("http.url", url);

      // Inject trace context headers for distributed tracing
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "x-ms-azsdk-telemetry": `galnet-ai;conversation_id=${convId}`,
      };
      propagation.inject(context.active(), headers);

      // Add metadata to request body for Azure AI Foundry tracing
      body.metadata = {
        conversation_id: convId,
        source: "galnet-ai",
      };

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      fetchSpan.setAttribute("http.status_code", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Azure Agent] Error: ${errorText}`);
        fetchSpan.setStatus({ code: SpanStatusCode.ERROR, message: errorText });
        fetchSpan.end();
        span.setStatus({ code: SpanStatusCode.ERROR, message: errorText });
        span.end();
        throw new Error(`Azure API error: ${response.status} - ${errorText}`);
      }

      fetchSpan.setStatus({ code: SpanStatusCode.OK });
      fetchSpan.end();

      if (!response.body) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: "No response body" });
        span.end();
        throw new Error("No response body");
      }

      // Transform Azure's SSE format to our own SSE format
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      let responseId = "";
      let inputTokens = 0;
      let outputTokens = 0;
      const streamStartTime = performance.now();

      const transformStream = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          const text = decoder.decode(chunk, { stream: true });
          const lines = text.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                const durationMs = performance.now() - streamStartTime;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: "done",
                  responseId,
                  usage: { input_tokens: inputTokens, output_tokens: outputTokens },
                  duration_ms: durationMs
                })}\n\n`));
                continue;
              }

              try {
                const event = JSON.parse(data) as StreamEvent;

                if (event.type === "response.created" && event.response?.id) {
                  responseId = event.response.id;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "start", responseId })}\n\n`));
                } else if (event.type === "response.output_text.delta" && event.delta) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "delta", content: event.delta })}\n\n`));
                } else if (event.type === "response.completed") {
                  // Capture usage stats from completed event
                  if (event.response?.usage) {
                    inputTokens = event.response.usage.input_tokens;
                    outputTokens = event.response.usage.output_tokens;
                  }
                  const durationMs = performance.now() - streamStartTime;
                  // Log metrics for tracing
                  console.log(`[Azure Agent] Stream completed - Response: ${responseId}, Duration: ${(durationMs/1000).toFixed(2)}s, Tokens: ${inputTokens} in / ${outputTokens} out`);
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    type: "done",
                    responseId,
                    usage: { input_tokens: inputTokens, output_tokens: outputTokens },
                    duration_ms: durationMs
                  })}\n\n`));
                }
              } catch {
                // Ignore parse errors for incomplete JSON
              }
            }
          }
        }
      });

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      return response.body.pipeThrough(transformStream);
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
      span.end();
      throw error;
    }
  });
}

/**
 * Start a new conversation with the Azure AI Foundry agent using Responses API
 */
export async function startAzureAgentChat(
  message: string,
  agentType: string,
  conversationId?: string
): Promise<AgentChatResponse> {
  return tracer.startActiveSpan("startAzureAgentChat", async (span) => {
    const startTime = performance.now();
    const convId = conversationId || generateConversationId();

    span.setAttribute("agent.name", agentName);
    span.setAttribute("agent.type", agentType);
    span.setAttribute("message.length", message.length);
    span.setAttribute("conversation.id", convId);

    try {
      const token = await getToken();
      const url = getResponsesUrl();

      console.log(`[Azure Agent] Starting chat with agent: ${agentName}, conversation: ${convId}`);
      console.log(`[Azure Agent] URL: ${url}`);

      const fetchSpan = tracer.startSpan("fetch.responses", {}, context.active());
      fetchSpan.setAttribute("http.method", "POST");
      fetchSpan.setAttribute("http.url", url);

      // Inject trace context headers for distributed tracing
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "x-ms-azsdk-telemetry": `galnet-ai;conversation_id=${convId}`,
      };
      propagation.inject(context.active(), headers);

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          agent: { type: "agent_reference", name: agentName },
          input: message,
          metadata: {
            conversation_id: convId,
            source: "galnet-ai",
          }
        }),
      });

      const duration = ((performance.now() - startTime) / 1000).toFixed(2);
      console.log(`[Azure Agent] Response received in ${duration}s - Status: ${response.status}`);

      fetchSpan.setAttribute("http.status_code", response.status);
      fetchSpan.setAttribute("response.duration_s", parseFloat(duration));

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Azure Agent] Error: ${errorText}`);
        fetchSpan.setStatus({ code: SpanStatusCode.ERROR, message: errorText });
        fetchSpan.end();
        throw new Error(`Azure API error: ${response.status} - ${errorText}`);
      }

      fetchSpan.setStatus({ code: SpanStatusCode.OK });
      fetchSpan.end();

      const data = await response.json() as ResponsesApiResponse;

      if (data.status !== "completed") {
        throw new Error(`Response not completed: ${data.status}`);
      }

      const assistantMessage = extractTextFromResponse(data);
      console.log(`[Azure Agent] Response: ${assistantMessage.substring(0, 100)}...`);

      span.setAttribute("response.id", data.id);
      span.setAttribute("response.length", assistantMessage.length);
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();

      return {
        message: assistantMessage,
        threadId: data.id,
        agentType,
        suggestions: [],
        conversationHistory: [
          { role: "user" as const, content: message },
          { role: "assistant" as const, content: assistantMessage }
        ]
      };
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
      span.end();
      throw error;
    }
  });
}

/**
 * Continue an existing conversation with the Azure AI Foundry agent
 * Uses previous_response_id for conversation context
 */
export async function continueAzureAgentChat(
  message: string,
  agentType: string,
  previousResponseId: string,
  conversationId?: string
): Promise<AgentChatResponse> {
  return tracer.startActiveSpan("continueAzureAgentChat", async (span) => {
    const startTime = performance.now();
    const convId = conversationId || generateConversationId();

    span.setAttribute("agent.name", agentName);
    span.setAttribute("agent.type", agentType);
    span.setAttribute("message.length", message.length);
    span.setAttribute("previous_response_id", previousResponseId);
    span.setAttribute("conversation.id", convId);

    try {
      const token = await getToken();
      const url = getResponsesUrl();

      console.log(`[Azure Agent] Continuing chat, conversation: ${convId}, previous_response_id: ${previousResponseId}`);

      const fetchSpan = tracer.startSpan("fetch.responses.continue", {}, context.active());
      fetchSpan.setAttribute("http.method", "POST");
      fetchSpan.setAttribute("http.url", url);

      // Inject trace context headers for distributed tracing
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "x-ms-azsdk-telemetry": `galnet-ai;conversation_id=${convId}`,
      };
      propagation.inject(context.active(), headers);

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          agent: { type: "agent_reference", name: agentName },
          input: message,
          previous_response_id: previousResponseId,
          metadata: {
            conversation_id: convId,
            source: "galnet-ai",
          }
        }),
      });

      const duration = ((performance.now() - startTime) / 1000).toFixed(2);
      console.log(`[Azure Agent] Response received in ${duration}s - Status: ${response.status}`);

      fetchSpan.setAttribute("http.status_code", response.status);
      fetchSpan.setAttribute("response.duration_s", parseFloat(duration));

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Azure Agent] Error: ${errorText}`);
        fetchSpan.setStatus({ code: SpanStatusCode.ERROR, message: errorText });
        fetchSpan.end();

        // If previous response not found, start a new conversation
        if (response.status === 404 || response.status === 400) {
          console.warn("[Azure Agent] Previous response not found, starting new conversation");
          span.setAttribute("fallback.new_conversation", true);
          span.end();
          return startAzureAgentChat(message, agentType);
        }

        throw new Error(`Azure API error: ${response.status} - ${errorText}`);
      }

      fetchSpan.setStatus({ code: SpanStatusCode.OK });
      fetchSpan.end();

      const data = await response.json() as ResponsesApiResponse;

      if (data.status !== "completed") {
        throw new Error(`Response not completed: ${data.status}`);
      }

      const assistantMessage = extractTextFromResponse(data);
      console.log(`[Azure Agent] Response: ${assistantMessage.substring(0, 100)}...`);

      span.setAttribute("response.id", data.id);
      span.setAttribute("response.length", assistantMessage.length);
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();

      return {
        message: assistantMessage,
        threadId: data.id,
        agentType,
        suggestions: [],
        conversationHistory: [
          { role: "user" as const, content: message },
          { role: "assistant" as const, content: assistantMessage }
        ]
      };
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
      span.end();
      throw error;
    }
  });
}

/**
 * Check Azure AI Foundry service health
 */
export async function checkAzureHealth(): Promise<{
  isOnline: boolean;
  responseTime?: number;
  error?: string;
}> {
  return tracer.startActiveSpan("checkAzureHealth", async (span) => {
    const startTime = performance.now();

    try {
      if (!projectEndpoint) {
        span.setAttribute("error.type", "configuration");
        span.setStatus({ code: SpanStatusCode.ERROR, message: "Endpoint not configured" });
        span.end();
        return {
          isOnline: false,
          error: "AZURE_EXISTING_AIPROJECT_ENDPOINT not configured"
        };
      }

      // Try to get a token to verify authentication
      await getToken();

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      span.setAttribute("health.online", true);
      span.setAttribute("health.response_time_ms", responseTime);
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();

      return {
        isOnline: true,
        responseTime
      };
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      span.setAttribute("health.online", false);
      span.setAttribute("health.response_time_ms", responseTime);
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
      span.end();

      return {
        isOnline: false,
        responseTime,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  });
}
