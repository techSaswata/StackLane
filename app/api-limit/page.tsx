"use client"

import Link from "next/link"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ApiLimitPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-black">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-green-500/20 animate-gradient-x"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black"></div>
      </div>

      {/* Content box */}
      <div className="relative w-full max-w-md">
        <div className="backdrop-blur-xl bg-black/30 p-8 rounded-2xl border border-white/10 shadow-2xl animate-float">
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <AlertCircle className="h-16 w-16 text-blue-400 animate-pulse" />
            </div>
            
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-green-400 bg-clip-text text-transparent">
              GitHub API Limit Exceeded 
            </h1>
            <p className="text-8xl font-bold"> 😔 </p>
            
            <p className="text-gray-300/90 leading-relaxed">
              Tooooo many Visitors at once!<br />
              <span className="text-blue-400">Sorry from StackLane</span>
            </p>

            <Link href="/" className="block">
              <Button 
                className="w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-green-500 hover:from-blue-600 hover:via-indigo-600 hover:to-green-600 text-white border-0 transition-all duration-300 transform hover:scale-105"
                variant="outline"
              >
                Please Try Again after 1-2 hours
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
