"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/components/supabase-provider"
import DashboardLayout from "@/components/dashboard-layout"
import { RepoCard } from "@/components/repo-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { AuthLoading } from "@/components/auth-loading"

type Repository = {
  id: number
  name: string
  full_name: string
  description: string
  html_url: string
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  updated_at: string
}

export default function RoomsPage() {
  const { user, loading: userLoading } = useSupabase()
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)
  const [showLoading, setShowLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login")
    }
  }, [user, userLoading, router])

  useEffect(() => {
    async function fetchRepositories() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          console.error("No session found")
          return
        }

        const response = await fetch("https://api.github.com/user/repos", {
          headers: {
            Authorization: `Bearer ${session.provider_token}`,
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch repositories")
        }

        const data = await response.json()
        setRepositories(data)
      } catch (error) {
        console.error("Error fetching rooms:", error)
        setError("Failed to load your rooms. Please try again later.")
      } finally {
        setLoading(false)
        // Keep loading screen for 2 more seconds
        setTimeout(() => {
          setShowLoading(false)
        }, 2000)
      }
    }

    if (user) {
      fetchRepositories()
    }
  }, [user, supabase])

  if (userLoading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <>
      {showLoading && <AuthLoading message="Customising your Rooms" />}
      <div className={showLoading ? "hidden" : "block"}>
        <DashboardLayout>
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Your Rooms</h1>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-48 w-full rounded-lg" />
                ))}
              </div>
            ) : repositories.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {repositories.map((repo) => (
                  <RepoCard key={repo.id} repository={repo} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <h3 className="text-xl font-medium mb-2">No repositories found</h3>
                <p className="text-white/60 mb-6">You don't have any GitHub repositories connected as rooms, or we couldn't access them.</p>
                <a
                  href="https://github.com/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-md hover:opacity-90 transition-all text-sm font-semibold"
                >
                  Create a new GitHub repository
                </a>
              </div>
            )}
          </div>
        </DashboardLayout>
      </div>
    </>
  )
}
