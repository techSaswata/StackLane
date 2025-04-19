import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { SupabaseProvider } from "@/components/supabase-provider"

// Import the environment validation
import { validateEnv } from "@/lib/env"

// Add validation before the component
// This will log errors if required environment variables are missing
validateEnv()

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "StackLane - GitHub Enhanced for Developers",
  description:
    "A collaborative platform for developers to manage projects, chat, and track issues without writing code.",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-[#0a0a0a] text-white antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <SupabaseProvider>
            {children}
            <Toaster />
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
