// API service for Galnet agent integration
// Uses local Next.js API routes that connect to Azure AI Foundry

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

async function makeApiRequest<T>(
  endpoint: string,
  requestData: unknown
): Promise<T> {
  console.log('[GALNET-API] Making request to:', endpoint)
  console.log('[GALNET-API] Request data:', JSON.stringify(requestData))

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    })

    console.log('[GALNET-API] Response status:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[GALNET-API] Error response:', errorText)
      let errorData: ApiError
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { message: 'Unknown error occurred' }
      }
      throw new GalnetApiError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status
      )
    }

    const text = await response.text()
    console.log('[GALNET-API] Response text:', text.substring(0, 200))

    let data: T
    try {
      data = JSON.parse(text)
    } catch (parseError) {
      console.error('[GALNET-API] JSON parse error:', parseError)
      throw new GalnetApiError('Failed to parse API response')
    }

    console.log('[GALNET-API] Parsed data:', JSON.stringify(data).substring(0, 200))

    // Validate the response structure
    if (!data || typeof data !== 'object') {
      throw new GalnetApiError('Invalid response format from API')
    }

    return data
  } catch (error) {
    console.error('[GALNET-API] Error:', error)
    if (error instanceof GalnetApiError) {
      throw error
    }
    throw new GalnetApiError(
      error instanceof Error ? error.message : 'Network error occurred'
    )
  }
}

export async function startGalnetChat(message: string): Promise<ApiResponse> {
  return makeApiRequest<ApiResponse>('/api/agent', {
    message,
    agentType: "galnet"
  })
}

export async function continueGalnetChat(
  threadId: string,
  message: string
): Promise<ApiResponse> {
  return makeApiRequest<ApiResponse>('/api/agent', {
    message,
    agentType: "galnet",
    threadId
  })
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