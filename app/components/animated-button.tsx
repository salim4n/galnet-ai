"use client"

import React from "react"
import { Button, ButtonProps } from "@/components/ui/button"
import { Send, Radio, Zap, Database } from "lucide-react"

interface AnimatedButtonProps extends ButtonProps {
  isProcessing?: boolean
  children?: React.ReactNode
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({ 
  isProcessing = false, 
  children, 
  ...props 
}) => {
  return (
    <Button
      {...props}
      disabled={isProcessing || props.disabled}
      className={`relative overflow-hidden transition-all duration-300 ${
        isProcessing 
          ? 'bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 bg-[length:200%_auto] animate-gradient-x'
          : 'bg-orange-500 hover:bg-orange-600'
      } text-black font-semibold px-6 disabled:opacity-80 disabled:cursor-not-allowed`}
    >
      {isProcessing ? (
        <>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex space-x-1">
              <Radio className="w-4 h-4 text-black animate-pulse" />
              <Zap className="w-4 h-4 text-black animate-pulse" style={{ animationDelay: "0.2s" }} />
              <Database className="w-4 h-4 text-black animate-pulse" style={{ animationDelay: "0.4s" }} />
            </div>
          </div>
          <span className="invisible">{children || <Send className="w-4 h-4" />}</span>
        </>
      ) : (
        children || <Send className="w-4 h-4" />
      )}
    </Button>
  )
}
