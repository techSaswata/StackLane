"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Plus, MessageSquare } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

type Issue = {
  id: number
  number: number
  title: string
  state: string
  html_url: string
  created_at: string
  updated_at: string
  comments: number
  user: {
    login: string
    avatar_url: string
  }
  labels: Array<{
    id: number
    name: string
    color: string
  }>
}

export function IssuesPanel({ repoFullName }: { repoFullName: string }) {
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingPercentage, setLoadingPercentage] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (loading) {
      interval = setInterval(() => {
        setLoadingPercentage((prev) => (prev < 100 ? prev + 20 : 0))
      }, 200)
    }
    return () => clearInterval(interval)
  }, [loading])

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/github/repos/${repoFullName}/issues`)

        if (!response.ok) {
          throw new Error("Failed to fetch issues")
        }

        const data = await response.json()
        setIssues(data)
      } catch (err) {
        console.error("Error fetching issues:", err)
        setError("Failed to load issues. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchIssues()
  }, [repoFullName])

  if (loading) {
    return (
      <Card className="border border-indigo-500/20 bg-black/80 backdrop-blur-xl shadow-xl shadow-indigo-500/10 overflow-hidden rounded-xl h-full flex flex-col w-full">
        <CardContent className="p-6 flex flex-col h-full w-full">
          <h2 className="text-xl font-semibold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Issues</h2>
          <div className="flex items-center justify-center h-[400px] relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-cyan-400"></div>
            <div className="absolute flex items-center justify-center h-16 w-16">
              <span className="text-cyan-400 font-bold text-lg">{loadingPercentage}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-white flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-red-500" />
        <span>{error}</span>
      </div>
    )
  }

  return (
    <Card className="border border-indigo-500/20 bg-black/80 backdrop-blur-xl shadow-xl shadow-indigo-500/10 overflow-hidden rounded-xl h-full flex flex-col w-full">
      <CardContent className="p-6 flex flex-col h-full w-full">
        <div className="flex justify-between items-center mb-6 w-full">
          <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Issues</h2>
          {/* <Button className="bg-gradient-to-r from-purple-600 to-blue-500 hover:opacity-90">
            <Plus className="h-4 w-4 mr-2" />
            New Issue
          </Button> */}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-4 w-full">
          {issues.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-white/60">No issues found for this repository.</p>
            </div>
          ) : (
            issues.map((issue) => (
              <Card key={issue.id} className="border border-indigo-500/20 bg-black/80 backdrop-blur-xl overflow-hidden rounded-xl transition-colors hover:border-cyan-400/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">
                          <a
                            href={issue.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-purple-400 transition-colors"
                          >
                            {issue.title}
                          </a>
                        </h3>
                        <Badge variant={issue.state === "open" ? "default" : "secondary"}>{issue.state}</Badge>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-2">
                        {issue.labels.map((label) => (
                          <Badge
                            key={label.id}
                            style={{
                              backgroundColor: `#${label.color}20`,
                              color: `#${label.color}`,
                              borderColor: `#${label.color}40`,
                            }}
                            variant="outline"
                          >
                            {label.name}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-white/60">
                        <span>#{issue.number}</span>
                        <span>Opened by {issue.user.login}</span>
                        <span>{formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}</span>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          <span>{issue.comments}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
