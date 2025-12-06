"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { streamGalnetChat, GalnetApiError, type Suggestion } from "@/lib/galnet-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Zap, Radio, HelpCircle, ExternalLink } from "lucide-react"
import { AboutModal } from "./components/about-modal"
import { StreamingText } from "./components/streaming-text"
import { ProgressIndicator } from "./components/progress-indicator"
import { AnimatedButton } from "./components/animated-button"
import { SuggestionChips } from "./components/suggestion-chips"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface Message {
  id: string
  content: string
  sender: "user" | "galnet"
  timestamp: Date
  suggestions?: Suggestion[]
}

// Custom link component for markdown with Elite Dangerous styling
const CustomLink = ({ href, children, ...props }: any) => {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-orange-400 hover:text-orange-300 
                 underline decoration-orange-500/50 hover:decoration-orange-300 
                 decoration-2 underline-offset-2 transition-all duration-200
                 hover:bg-orange-500/10 px-1 py-0.5 rounded
                 border border-transparent hover:border-orange-500/30
                 font-medium tracking-wide"
      {...props}
    >
      {children}
      <ExternalLink className="w-3 h-3 ml-1 opacity-70" />
    </a>
  )
}

export default function EliteDangerousChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Agent GALNET initialisé. Prêt à vous aider avec les informations sur Elite Dangerous et les nouvelles galactiques.",
      sender: "galnet",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [showAboutModal, setShowAboutModal] = useState(false)
  const [currentSuggestions, setCurrentSuggestions] = useState<Suggestion[]>([])
  const [streamingContent, setStreamingContent] = useState("")

  // Suggested queries for new users
  const suggestedQueries = [
    "Parle-moi des Thargoids",
    "Quelles sont les superpuissances dans Elite Dangerous ?",
    "Comment fonctionne le Powerplay ?",
    "Qu'est-ce que l'Alliance ?",
    "Raconte-moi l'histoire de l'Empire"
  ]

  const handleSuggestedQuery = (query: string) => {
    setInputValue(query)
    // Small delay to show the query was selected, then send
    setTimeout(() => {
      sendMessage(query)
    }, 200)
  }

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isTyping) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageText,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsTyping(true)
    setError(null)
    setStreamingContent("")

    let accumulatedContent = ""
    const messageId = (Date.now() + 1).toString()

    await streamGalnetChat(messageText, threadId, {
      onStart: (responseId) => {
        console.log("[Stream] Started, responseId:", responseId)
        // Add empty message that will be updated
        const aiMessage: Message = {
          id: messageId,
          content: "",
          sender: "galnet",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, aiMessage])
      },
      onDelta: (content) => {
        accumulatedContent += content
        setStreamingContent(accumulatedContent)
        // Update the message content
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, content: accumulatedContent } : msg
          )
        )
      },
      onDone: (responseId) => {
        console.log("[Stream] Done, responseId:", responseId)
        setThreadId(responseId)
        setIsTyping(false)
        setStreamingContent("")
        setCurrentSuggestions([])
      },
      onError: (err) => {
        console.error("[Stream] Error:", err)
        const errorMessage = err instanceof GalnetApiError
          ? `GALNET Error: ${err.message}`
          : "Connection to GALNET network failed. Please try again."

        setError(errorMessage)
        // Update or add error message
        if (accumulatedContent) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId ? { ...msg, content: accumulatedContent || errorMessage } : msg
            )
          )
        } else {
          const errorAiMessage: Message = {
            id: messageId,
            content: errorMessage,
            sender: "galnet",
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, errorAiMessage])
        }
        setIsTyping(false)
        setStreamingContent("")
      },
    })
  }

  const handleSendMessage = async () => {
    sendMessage(inputValue)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div className="min-h-screen bg-black text-orange-400 font-mono relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-900/10 via-black to-amber-900/10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,165,0,0.1),transparent_50%)]" />

      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
            linear-gradient(rgba(255,165,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,165,0,0.1) 1px, transparent 1px)
          `,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-orange-500/30 bg-black/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                <Radio className="w-4 h-4 text-black" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-orange-400 tracking-wider">GALNET INTELLIGENCE</h1>
                <StreamingText text="Elite Dangerous Command Interface" speed={15} />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-xs">
                <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-400' : 'bg-green-400 animate-pulse'}`} />
                <StreamingText text={error ? 'ERROR' : 'ONLINE'} speed={15} />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                onClick={() => setShowAboutModal(true)}
              >
                <HelpCircle className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="relative z-10 flex flex-col h-[calc(100vh-80px)]">
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4 max-w-4xl mx-auto">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.sender === "user"
                      ? "bg-orange-500/20 border border-orange-500/30 text-orange-200"
                      : "bg-amber-500/10 border border-amber-500/20 text-amber-200"
                  } backdrop-blur-sm`}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <div
                      className={`w-2 h-2 rounded-full ${message.sender === "user" ? "bg-orange-400" : "bg-amber-400"}`}
                    />
                    <span className="text-xs font-semibold tracking-wider">
                      {message.sender === "user" ? "COMMANDER" : "GALNET AGENT"}
                    </span>
                    <span className="text-xs opacity-60">{message.timestamp.toLocaleTimeString()}</span>
                  </div>
                  {message.sender === "galnet" ? (
                    <div className="leading-relaxed prose prose-invert max-w-none
                        prose-headings:text-amber-200 prose-headings:font-bold prose-headings:tracking-wider prose-headings:mb-2
                        prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-h4:text-sm
                        prose-p:text-amber-200 prose-p:leading-relaxed prose-p:mb-3
                        prose-strong:text-orange-300 prose-strong:font-semibold
                        prose-em:text-amber-300 prose-em:italic
                        prose-ul:text-amber-200 prose-li:text-amber-200 prose-li:mb-1
                        prose-ol:text-amber-200
                        prose-blockquote:border-l-orange-500 prose-blockquote:border-l-4 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-amber-300
                        prose-img:rounded-lg prose-img:border prose-img:border-amber-500/20 prose-img:shadow-lg
                        prose-hr:border-orange-500/30 prose-hr:my-4
                        prose-code:text-orange-300 prose-code:bg-orange-500/10 prose-code:px-1 prose-code:rounded prose-code:text-sm
                        prose-pre:bg-black/50 prose-pre:border prose-pre:border-orange-500/30 prose-pre:rounded-lg
                        prose-table:text-amber-200 prose-th:text-orange-300 prose-td:border-amber-500/20">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: CustomLink,
                          p: ({node, ...props}) => <p {...props} className="mb-3 last:mb-0" />,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="leading-relaxed">{message.content}</p>
                  )}
                </div>
              </div>
            ))}

            {isTyping && !streamingContent && (
              <div className="flex justify-start flex-col space-y-4">
                <ProgressIndicator isProcessing={isTyping} />
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 backdrop-blur-sm">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-xs font-semibold tracking-wider text-amber-200">GALNET AGENT</span>
                  </div>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-orange-500/30 bg-black/80 backdrop-blur-sm p-4">
          <div className="max-w-4xl mx-auto">
            {/* Suggested Queries - Initial or AI Suggestions */}
            {!isTyping && (
              <>
                {messages.length === 1 && (
                  <div className="mb-4">
                    <p className="text-xs text-orange-600 mb-2 font-medium tracking-wider">SUGGESTIONS GALNET:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedQueries.map((query, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestedQuery(query)}
                          className="px-3 py-2 text-xs bg-orange-500/10 hover:bg-orange-500/20 
                                     border border-orange-500/30 hover:border-orange-400/50
                                     text-orange-300 hover:text-orange-200 rounded
                                     transition-all duration-200 font-medium tracking-wide
                                     hover:shadow-lg hover:shadow-orange-500/10"
                        >
                          {query}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {currentSuggestions.length > 0 && messages.length > 1 && (
                  <SuggestionChips 
                    suggestions={currentSuggestions}
                    onSuggestionClick={handleSuggestedQuery}
                    isLoading={isTyping}
                  />
                )}
              </>
            )}
            <div className="flex space-x-4">
              <div className="flex-1 relative">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter query for GALNET intelligence..."
                  className="bg-orange-500/10 border-orange-500/30 text-orange-200 placeholder-orange-600 focus:border-orange-400 focus:ring-orange-400/20 pr-12"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Zap className="w-4 h-4 text-orange-500" />
                </div>
              </div>
              <AnimatedButton
                onClick={handleSendMessage}
                isProcessing={isTyping}
                disabled={!inputValue.trim() || isTyping}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-orange-600">
              <span>Press Enter to send • Shift+Enter for new line</span>
              <span className="flex items-center space-x-1">
                <div className="w-1 h-1 bg-orange-500 rounded-full animate-pulse" />
                <span>Neural link active</span>
              </span>
            </div>
          </div>
        </div>
      </main>
      <AboutModal open={showAboutModal} onOpenChange={setShowAboutModal} />
    </div>
  )
}
