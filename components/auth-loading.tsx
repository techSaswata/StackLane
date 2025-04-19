"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Github } from "lucide-react"

interface AuthLoadingProps {
  message?: string
}

export function AuthLoading({ message = "Connecting to GitHub..." }: AuthLoadingProps) {
  const [progress, setProgress] = useState(0)
  const messages = [
    message,
    message,
    message,
    message,
    message
  ]
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    // Simulate progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 0.5
      })
    }, 50)

    // Cycle through messages
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length)
    }, 3000)

    return () => {
      clearInterval(interval)
      clearInterval(messageInterval)
    }
  }, [messages.length])

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
      <div className="relative w-full max-w-md px-4 py-8">
        {/* Animated cosmic background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px]">
            <motion.div 
              className="absolute w-2 h-2 bg-purple-500 rounded-full"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 2.5, 0],
                opacity: [0, 0.8, 0],
                x: [0, 150, 200], 
                y: [0, -100, -50]
              }}
              transition={{ duration: 4, repeat: Infinity, repeatType: "loop" }}
            />
            <motion.div 
              className="absolute w-2 h-2 bg-blue-500 rounded-full"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 2, 0],
                opacity: [0, 0.7, 0],
                x: [0, -120, -180], 
                y: [0, 80, 120]
              }}
              transition={{ duration: 5, repeat: Infinity, repeatType: "loop", delay: 0.5 }}
            />
            <motion.div 
              className="absolute w-2 h-2 bg-indigo-500 rounded-full"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 3, 0],
                opacity: [0, 0.6, 0],
                x: [0, 80, 100], 
                y: [0, 100, 150]
              }}
              transition={{ duration: 4.5, repeat: Infinity, repeatType: "loop", delay: 1 }}
            />
            <motion.div 
              className="absolute w-3 h-3 bg-pink-500 rounded-full"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 2, 0],
                opacity: [0, 0.5, 0],
                x: [0, -80, -150], 
                y: [0, -120, -200]
              }}
              transition={{ duration: 5.5, repeat: Infinity, repeatType: "loop", delay: 1.5 }}
            />
            <motion.div 
              className="absolute w-2 h-2 bg-cyan-500 rounded-full"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 2.2, 0],
                opacity: [0, 0.7, 0],
                x: [0, 180, 250], 
                y: [0, -50, -120]
              }}
              transition={{ duration: 5, repeat: Infinity, repeatType: "loop", delay: 2 }}
            />
          </div>
        </div>

        {/* Center GitHub logo with orbit animation */}
        <div className="flex justify-center mb-8 relative">
          <div className="relative">
            {/* Orbiting elements */}
            <motion.div
              className="absolute w-full h-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              <motion.div 
                className="absolute w-4 h-4 bg-purple-500 rounded-full"
                style={{ top: -10, left: "50%", marginLeft: -2 }}
              />
            </motion.div>
            
            <motion.div
              className="absolute w-full h-full"
              animate={{ rotate: -360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            >
              <motion.div 
                className="absolute w-3 h-3 bg-blue-500 rounded-full"
                style={{ bottom: -8, left: "50%", marginLeft: -1.5 }}
              />
            </motion.div>
            
            {/* GitHub logo */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center z-20 relative">
              <Github className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        {/* Message with fade transition */}
        <div className="h-8 relative mb-8">
          <AnimatePresence mode="wait">
            <motion.p
              key={messageIndex}
              className="text-white/90 text-center absolute w-full"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
            >
              {messages[messageIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-800 rounded-full w-full max-w-xs mx-auto overflow-hidden mb-4">
          <motion.div 
            className="h-full bg-gradient-to-r from-purple-600 via-blue-500 to-purple-600 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
            style={{ 
              backgroundSize: "200% 100%",
              animation: "gradientShift 2s linear infinite"
            }}
          />
        </div>

        {/* Progress percentage */}
        <motion.p 
          className="text-white/60 text-sm text-center"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {Math.round(progress)}% complete
        </motion.p>
      </div>

      {/* Add a global style for the gradient animation */}
      <style jsx global>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  )
} 