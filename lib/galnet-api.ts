// API service for Galnet agent integration

interface StartChatRequest {
  agentType: "galnet"
  message: string
}

interface ContinueChatRequest {
  threadId: string
  message: string
  agentType: "galnet"
}

interface Suggestion {
  question: string
  type: "request" | "question" | "exploration"
}

interface ApiResponse {
  message: string
  threadId: string
  agentType: string
  suggestions?: Suggestion[]
  conversationHistory: Array<{
    role: "user" | "assistant"
    content: string
  }>
}

interface ApiError {
  message: string
  code?: number
}

class GalnetApiError extends Error {
  constructor(
    message: string,
    public code?: number
  ) {
    super(message)
    this.name = 'GalnetApiError'
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://votre-api.com'

// Debug environment variable loading
console.log('API_BASE_URL loaded:', API_BASE_URL)

// Helper function to properly construct API URLs
function buildApiUrl(endpoint: string): string {
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${baseUrl}${cleanEndpoint}`
}

async function makeApiRequest<T>(
  endpoint: string,
  requestData: unknown
): Promise<T> {
  const url = buildApiUrl(endpoint)
  console.log('Making API request to:', url) // Debug log
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    })

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        message: 'Unknown error occurred'
      }))
      throw new GalnetApiError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status
      )
    }

    const data = await response.json()
    console.log('API response received:', data) // Debug log
    
    // Validate the response structure
    if (!data || typeof data !== 'object') {
      throw new GalnetApiError('Invalid response format from API')
    }
    
    return data
  } catch (error) {
    if (error instanceof GalnetApiError) {
      throw error
    }
    throw new GalnetApiError(
      error instanceof Error ? error.message : 'Network error occurred'
    )
  }
}

export async function startGalnetChat(message: string): Promise<ApiResponse> {
  const request: StartChatRequest = {
    agentType: "galnet",
    message
  }

  return makeApiRequest<ApiResponse>('/v2/agent/start-chat', request)
}

export async function continueGalnetChat(
  threadId: string,
  message: string
): Promise<ApiResponse> {
  const request: ContinueChatRequest = {
    threadId,
    message,
    agentType: "galnet"
  }

  return makeApiRequest<ApiResponse>('/v2/agent/continue-chat', request)
}

// Extract final answer from the ReAct format response
export function extractFinalAnswer(response: string | undefined | null): string {
  // Handle undefined, null, or empty responses
  if (!response || typeof response !== 'string') {
    console.warn('extractFinalAnswer received invalid response:', response)
    return 'Error: Invalid response from GALNET agent'
  }

  try {
    const finalAnswerMatch = response.match(/Final Answer:\s*([\s\S]*)$/m)
    return finalAnswerMatch ? finalAnswerMatch[1].trim() : response
  } catch (error) {
    console.error('Error extracting final answer:', error)
    return response
  }
}

export { GalnetApiError }
export type { ApiResponse, ApiError, Suggestion }