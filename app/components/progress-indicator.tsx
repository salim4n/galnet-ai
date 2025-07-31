"use client"

import React, { useState, useEffect } from "react"
import { Radio, Database, Zap, Satellite, Cpu } from "lucide-react"

interface ProgressIndicatorProps {
  isProcessing: boolean
}

const progressMessages = [
  { icon: Radio, text: "📡 Connexion aux relais hyperspatiaux..." },
  { icon: Database, text: "🔍 Scan des bases de données GALNET..." },
  { icon: Zap, text: "⚡ Analyse approfondie en cours..." },
  { icon: Satellite, text: "🛰️ Interrogation des stations orbitales..." },
  { icon: Cpu, text: "🧠 Traitement neural en cours..." },
  { icon: Radio, text: "📡 Transmission des résultats..." }
]

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ isProcessing }) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isProcessing) {
      setIsVisible(true)
      
      // Cycle through messages every 3 seconds
      const messageInterval = setInterval(() => {
        setCurrentMessageIndex(prev => (prev + 1) % progressMessages.length)
      }, 3000)

      return () => clearInterval(messageInterval)
    } else {
      const hideTimeout = setTimeout(() => setIsVisible(false), 500)
      return () => clearTimeout(hideTimeout)
    }
  }, [isProcessing])

  if (!isVisible) return null

  const { icon: Icon, text } = progressMessages[currentMessageIndex]

  return (
    <div className={`flex items-center space-x-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 backdrop-blur-sm transition-opacity duration-500 ${isProcessing ? 'opacity-100' : 'opacity-0'}`}>
      <Icon className="w-5 h-5 text-amber-400 animate-pulse" />
      <span className="text-amber-200 font-medium tracking-wide">{text}</span>
      <div className="flex space-x-1 ml-2">
        <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" />
        <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
        <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
      </div>
    </div>
  )
}
