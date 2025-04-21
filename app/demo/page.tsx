"use client"

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-black">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 animate-gradient-x"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
      </div>

      {/* Floating orbs in background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-500/30 rounded-full blur-xl animate-float"></div>
        <div className="absolute top-1/3 right-1/4 w-40 h-40 bg-purple-500/30 rounded-full blur-xl animate-float-delayed"></div>
        <div className="absolute bottom-1/4 left-1/3 w-36 h-36 bg-indigo-500/30 rounded-full blur-xl animate-float-slow"></div>
      </div>

      {/* Content box */}
      <div className="relative">
        <div className="backdrop-blur-xl bg-white/5 p-8 rounded-2xl border border-white/10 shadow-2xl animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent mb-4">
            Tutorial Demo Coming Soon!
          </h1>
          <p className="text-gray-400 text-lg">
            We&apos;re working on something amazing!
          </p>
        </div>
      </div>
    </div>
  )
}
