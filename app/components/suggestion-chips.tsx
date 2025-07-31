"use client"

import { Button } from "@/components/ui/button"
import { Lightbulb, MessageCircle, Compass } from "lucide-react"
import type { Suggestion } from "@/lib/galnet-api"
import { useState } from "react"
import { StreamingText } from "./streaming-text"

interface SuggestionChipsProps {
  suggestions: Suggestion[]
  onSuggestionClick: (question: string) => void
  isLoading?: boolean
}

const getIconForType = (type: Suggestion['type']) => {
  switch (type) {
    case 'request':
      return <Lightbulb className="w-3 h-3" />
    case 'question':
      return <MessageCircle className="w-3 h-3" />
    case 'exploration':
      return <Compass className="w-3 h-3" />
    default:
      return <MessageCircle className="w-3 h-3" />
  }
}

const getColorForType = (type: Suggestion['type']) => {
  switch (type) {
    case 'request':
      return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 hover:border-blue-400/50 text-blue-300 hover:text-blue-200'
    case 'question':
      return 'from-orange-500/20 to-amber-500/20 border-orange-500/30 hover:border-orange-400/50 text-orange-300 hover:text-orange-200'
    case 'exploration':
      return 'from-purple-500/20 to-pink-500/20 border-purple-500/30 hover:border-purple-400/50 text-purple-300 hover:text-purple-200'
    default:
      return 'from-orange-500/20 to-amber-500/20 border-orange-500/30 hover:border-orange-400/50 text-orange-300 hover:text-orange-200'
  }
}

export function SuggestionChips({ suggestions, onSuggestionClick, isLoading = false }: SuggestionChipsProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  
  if (!suggestions || suggestions.length === 0) return null

  return (
    <div className="space-y-2 mb-3 relative">
      <div className="flex items-center space-x-1.5">
        <div className="w-0.5 h-3 bg-gradient-to-b from-orange-400 to-amber-400 rounded-full" />
        <p className="text-[10px] text-orange-400/80 font-medium tracking-wider uppercase">
          Suggestions
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-32 overflow-y-auto">
        {suggestions.slice(0, 4).map((suggestion, index) => (
          <div key={index} className="relative">
            <Button
              variant="ghost"
              onClick={() => onSuggestionClick(suggestion.question)}
              disabled={isLoading}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`
                relative group w-full h-auto p-2 text-left justify-start
                bg-gradient-to-r ${getColorForType(suggestion.type)}
                border transition-all duration-200 ease-out
                hover:shadow-md hover:shadow-orange-500/5
                disabled:opacity-50
                text-[11px] leading-tight
              `}
            >
              <div className="flex items-center space-x-1.5 w-full">
                <div className="flex-shrink-0 opacity-60 group-hover:opacity-80 transition-opacity">
                  {getIconForType(suggestion.type)}
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <StreamingText text={suggestion.question} speed={15} />
                </div>
              </div>
            </Button>
            
            {/* Tooltip */}
            {hoveredIndex === index && suggestion.question.length > 60 && (
              <div className="absolute z-50 bottom-full left-0 right-0 mb-2 p-3 
                            bg-black/95 border border-orange-500/30 rounded-lg shadow-xl
                            backdrop-blur-sm animate-in fade-in-0 zoom-in-95 duration-200">
                <div className="flex items-start space-x-2">
                  <div className="flex-shrink-0 mt-0.5 text-orange-400/70">
                    {getIconForType(suggestion.type)}
                  </div>
                  <p className="text-xs text-orange-200 leading-relaxed font-medium">
                    {suggestion.question}
                  </p>
                </div>
                <div className="flex items-center mt-2 opacity-60">
                  <div className="w-1 h-1 rounded-full bg-orange-400 mr-1.5" />
                  <span className="text-[10px] uppercase tracking-wider text-orange-400/80">
                    {suggestion.type}
                  </span>
                </div>
                {/* Arrow */}
                <div className="absolute top-full left-4 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] 
                              border-l-transparent border-r-transparent border-t-orange-500/30"></div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {suggestions.length > 4 && (
        <p className="text-[9px] text-orange-400/60 text-center">
          +{suggestions.length - 4} autres suggestions
        </p>
      )}
    </div>
  )
}