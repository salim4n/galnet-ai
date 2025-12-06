import { DefaultAzureCredential } from "@azure/identity";
import type { AgentChatResponse } from "./types";

// Configuration from environment
const projectEndpoint = process.env.AZURE_EXISTING_AIPROJECT_ENDPOINT || "";
const agentName = process.env.AZURE_EXISTING_AGENT_ID?.split(":")[0] || "galnet";
const apiVersion = "2025-11-15-preview";

// Cached token
let cachedToken: { token: string; expiresAt: number } | null = null;
const credential = new DefaultAzureCredential();

/**
 * Get a valid Azure token, refreshing if needed
 */
async function getToken(): Promise<string> {
  const now = Date.now();
  // Refresh token 5 minutes before expiry
  if (cachedToken && cachedToken.expiresAt > now + 5 * 60 * 1000) {
    return cachedToken.token;
  }

  const tokenResponse = await credential.getToken("https://ai.azure.com/.default");
  if (!tokenResponse) {
    throw new Error("Failed to get Azure token");
  }

  cachedToken = {
    token: tokenResponse.token,
    expiresAt: tokenResponse.expiresOnTimestamp
  };

  return cachedToken.token;
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
}

/**
 * Start a streaming conversation with the Azure AI Foundry agent
 * Returns a ReadableStream that emits SSE-formatted events
 */
export async function startAzureAgentChatStream(
  message: string,
  agentType: string,
  previousResponseId?: string
): Promise<ReadableStream<Uint8Array>> {
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
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Azure Agent] Error: ${errorText}`);
    throw new Error(`Azure API error: ${response.status} - ${errorText}`);
  }

  if (!response.body) {
    throw new Error("No response body");
  }

  // Transform Azure's SSE format to our own SSE format
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let responseId = "";

  const transformStream = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      const text = decoder.decode(chunk, { stream: true });
      const lines = text.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            // Send final event with response ID
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", responseId })}\n\n`));
            continue;
          }

          try {
            const event = JSON.parse(data) as StreamEvent;

            // Handle different event types
            if (event.type === "response.created" && event.response?.id) {
              responseId = event.response.id;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "start", responseId })}\n\n`));
            } else if (event.type === "response.output_text.delta" && event.delta) {
              // Text delta - send the actual text content
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "delta", content: event.delta })}\n\n`));
            } else if (event.type === "response.completed") {
              // Response completed
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", responseId })}\n\n`));
            }
          } catch {
            // Ignore parse errors for incomplete JSON
          }
        }
      }
    }
  });

  return response.body.pipeThrough(transformStream);
}

/**
 * Start a new conversation with the Azure AI Foundry agent using Responses API
 */
export async function startAzureAgentChat(
  message: string,
  agentType: string
): Promise<AgentChatResponse> {
  const startTime = performance.now();

  const token = await getToken();
  const url = getResponsesUrl();

  console.log(`[Azure Agent] Starting chat with agent: ${agentName}`);
  console.log(`[Azure Agent] URL: ${url}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      agent: { type: "agent_reference", name: agentName },
      input: message
    }),
  });

  const duration = ((performance.now() - startTime) / 1000).toFixed(2);
  console.log(`[Azure Agent] Response received in ${duration}s - Status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Azure Agent] Error: ${errorText}`);
    throw new Error(`Azure API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as ResponsesApiResponse;

  if (data.status !== "completed") {
    throw new Error(`Response not completed: ${data.status}`);
  }

  const assistantMessage = extractTextFromResponse(data);
  console.log(`[Azure Agent] Response: ${assistantMessage.substring(0, 100)}...`);

  return {
    message: assistantMessage,
    // Use response ID as "threadId" for conversation continuity
    threadId: data.id,
    agentType,
    suggestions: [],
    conversationHistory: [
      { role: "user", content: message },
      { role: "assistant", content: assistantMessage }
    ]
  };
}

/**
 * Continue an existing conversation with the Azure AI Foundry agent
 * Uses previous_response_id for conversation context
 */
export async function continueAzureAgentChat(
  message: string,
  agentType: string,
  previousResponseId: string
): Promise<AgentChatResponse> {
  const startTime = performance.now();

  const token = await getToken();
  const url = getResponsesUrl();

  console.log(`[Azure Agent] Continuing chat, previous_response_id: ${previousResponseId}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      agent: { type: "agent_reference", name: agentName },
      input: message,
      previous_response_id: previousResponseId
    }),
  });

  const duration = ((performance.now() - startTime) / 1000).toFixed(2);
  console.log(`[Azure Agent] Response received in ${duration}s - Status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Azure Agent] Error: ${errorText}`);

    // If previous response not found, start a new conversation
    if (response.status === 404 || response.status === 400) {
      console.warn("[Azure Agent] Previous response not found, starting new conversation");
      return startAzureAgentChat(message, agentType);
    }

    throw new Error(`Azure API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as ResponsesApiResponse;

  if (data.status !== "completed") {
    throw new Error(`Response not completed: ${data.status}`);
  }

  const assistantMessage = extractTextFromResponse(data);
  console.log(`[Azure Agent] Response: ${assistantMessage.substring(0, 100)}...`);

  return {
    message: assistantMessage,
    // Return new response ID for next message
    threadId: data.id,
    agentType,
    suggestions: [],
    conversationHistory: [
      { role: "user", content: message },
      { role: "assistant", content: assistantMessage }
    ]
  };
}

/**
 * Check Azure AI Foundry service health
 */
export async function checkAzureHealth(): Promise<{
  isOnline: boolean;
  responseTime?: number;
  error?: string;
}> {
  const startTime = performance.now();

  try {
    if (!projectEndpoint) {
      return {
        isOnline: false,
        error: "AZURE_EXISTING_AIPROJECT_ENDPOINT not configured"
      };
    }

    // Try to get a token to verify authentication
    await getToken();

    const endTime = performance.now();
    return {
      isOnline: true,
      responseTime: endTime - startTime
    };
  } catch (error) {
    const endTime = performance.now();
    return {
      isOnline: false,
      responseTime: endTime - startTime,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
