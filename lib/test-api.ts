// Quick test to verify API URL construction
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://votre-api.com'

function buildApiUrl(endpoint: string): string {
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${baseUrl}${cleanEndpoint}`
}

// Test cases
console.log('Testing URL construction:')
console.log('Base URL:', API_BASE_URL)
console.log('Start chat URL:', buildApiUrl('/v2/agent/start-chat'))
console.log('Continue chat URL:', buildApiUrl('/v2/agent/continue-chat'))

export { buildApiUrl }