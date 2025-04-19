"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useSupabase } from "@/components/supabase-provider"
import DashboardLayout from "@/components/dashboard-layout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChatPanel } from "@/components/chat-panel"
import { IssuesPanel } from "@/components/issues-panel"
import { PullRequestsPanel } from "@/components/pull-requests-panel"
import { ContributorsPanel } from "@/components/contributors-panel"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

type Repository = {
  id: number
  name: string
  full_name: string
  description: string
  html_url: string
  owner: {
    login: string
    avatar_url: string
  }
}

export default function RoomPage() {
  const { slug } = useParams()
  const { user, loading: userLoading } = useSupabase()
  const [repository, setRepository] = useState<Repository | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const repoFullName = Array.isArray(slug) ? slug.join("/") : slug

  useEffect(() => {
    const fetchRepository = async () => {
      if (!repoFullName) return

      try {
        setLoading(true)
        const response = await fetch(`/api/github/repos/${repoFullName}`)

        if (!response.ok) {
          throw new Error("Failed to fetch repository")
        }

        const data = await response.json()
        setRepository(data)
      } catch (err) {
        console.error("Error fetching repository:", err)
        setError("Failed to load repository details. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    if (repoFullName) {
      fetchRepository()
    }
  }, [repoFullName])

  if (userLoading || loading) {
    return (
      <DashboardLayout>
        <div className="h-screen bg-background">
          <div className="p-6">
            <Skeleton className="h-8 w-64 mb-6" />
            <Skeleton className="h-4 w-full max-w-md mb-8" />
            <Skeleton className="h-[calc(100vh-200px)] w-full rounded-lg" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="h-screen bg-background">
          <div className="p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="h-screen w-full bg-background">
        {repository && (
          <div className="h-full flex flex-col w-full">
            <div className="p-8 pb-4 flex-shrink-0 bg-gradient-to-r from-black via-[#0a0a0a] to-black border-b border-indigo-500/20">
              <div className="w-full">
                <h1 className="text-2xl font-bold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500">
                  {repository.owner.login}/{repository.name}
                </h1>
                <p className="text-slate-400 mt-1">{repository.description}</p>
              </div>
            </div>

            <Tabs defaultValue="chat" className="flex-1 flex flex-col min-h-0 w-full">
              <div className="border-b border-indigo-500/20 bg-black/40">
                <div className="w-full px-8">
                  <TabsList className="mb-0 border-0 bg-transparent h-14">
                    <TabsTrigger value="chat" className="data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-400">Chat</TabsTrigger>
                    <TabsTrigger value="issues" className="data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-400">Issues</TabsTrigger>
                    <TabsTrigger value="pull-requests" className="data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-400">Pull Requests</TabsTrigger>
                    <TabsTrigger value="contributors" className="data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-400">Contributors</TabsTrigger>
                  </TabsList>
                </div>
              </div>

              <div className="flex-1 min-h-0 w-full bg-gradient-to-br from-black via-[#0a0a0a] to-black">
                <div className="w-full px-8 py-6">
                  <TabsContent value="chat" className="h-full m-0 w-full">
                    <ChatPanel repoFullName={repository.full_name} />
                  </TabsContent>

                  <TabsContent value="issues" className="h-full m-0 w-full">
                    <IssuesPanel repoFullName={repository.full_name} />
                  </TabsContent>

                  <TabsContent value="pull-requests" className="h-full m-0 w-full">
                    <PullRequestsPanel repoFullName={repository.full_name} />
                  </TabsContent>

                  <TabsContent value="contributors" className="h-full m-0 w-full">
                    <ContributorsPanel repoFullName={repository.full_name} />
                  </TabsContent>
                </div>
              </div>
            </Tabs>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
