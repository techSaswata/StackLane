"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AuthLoading } from "@/components/auth-loading"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if we're coming from the auth flow
    const url = new URL(window.location.href)
    const authComplete = url.searchParams.get("auth_complete")
    
    if (authComplete === "true") {
      // Show loading animation briefly before showing dashboard
      setLoading(true)
      
      // Clear the URL param to avoid issues on refresh
      url.searchParams.delete("auth_complete")
      window.history.replaceState({}, "", url.toString())
      
      // Keep the loading animation for a little extra time to finish gracefully
      const timer = setTimeout(() => {
        setLoading(false)
      }, 2000)
      
      return () => clearTimeout(timer)
    }
  }, [router])

  return (
    <>
      {loading && <AuthLoading />}
      <div className={loading ? "hidden" : "block"}>
        {children}
      </div>
    </>
  )
}