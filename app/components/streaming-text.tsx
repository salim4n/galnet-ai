"use client"

import React, { useState, useEffect } from "react"

interface StreamingTextProps {
  text: string
  speed?: number
  onTypingComplete?: () => void
}

export const StreamingText: React.FC<StreamingTextProps> = ({ 
  text, 
  speed = 20,
  onTypingComplete 
}) => {
  const [displayedText, setDisplayedText] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex])
        setCurrentIndex(prev => prev + 1)
      }, speed)

      return () => clearTimeout(timeout)
    } else if (onTypingComplete) {
      onTypingComplete()
    }
  }, [currentIndex, text, speed, onTypingComplete])

  // Reset when text changes
  useEffect(() => {
    setDisplayedText("")
    setCurrentIndex(0)
  }, [text])

  return <span>{displayedText}</span>
}
