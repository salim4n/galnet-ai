// Types pour l'agent - can be imported in both client and server
export interface AgentMessage {
  content: string;
  id: string;
  metadata: Record<string, unknown>;
}

export interface AgentSuggestion {
  question: string;
  type: 'question' | 'request' | 'exploration';
}

export interface AgentChatResponse {
  message: string;
  assistantMessages?: AgentMessage[];
  threadId: string;
  agentType: string;
  suggestions?: AgentSuggestion[];
  conversationHistory: { role: 'user' | 'assistant'; content: string }[];
}

export interface HealthResult {
  isOnline: boolean;
  responseTime?: number;
  error?: string;
}
