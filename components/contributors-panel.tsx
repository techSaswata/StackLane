"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle } from "lucide-react"

type Contributor = {
  id: number
  login: string
  avatar_url: string
  html_url: string
  contributions: number
}

export function ContributorsPanel({ repoFullName }: { repoFullName: string }) {
  const [contributors, setContributors] = useState<Contributor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalContributions, setTotalContributions] = useState(0)
  const [loadingPercentage, setLoadingPercentage] = useState(0)

  useEffect(() => {
    const fetchContributors = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/github/repos/${repoFullName}/contributors`)

        if (!response.ok) {
          throw new Error("Failed to fetch contributors")
        }

        const data = await response.json()
        setContributors(data)

        // Calculate total contributions
        const total = data.reduce((sum: number, contributor: Contributor) => sum + contributor.contributions, 0)
        setTotalContributions(total)
      } catch (err) {
        console.error("Error fetching contributors:", err)
        setError("Failed to load contributors. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchContributors()
  }, [repoFullName])

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingPercentage(prev => prev < 100 ? prev + 20 : 0);
      }, 200);
    }
    return () => clearInterval(interval);
  }, [loading]);

  if (loading) {
    return (
      <Card className="border border-indigo-500/20 bg-black/80 backdrop-blur-xl shadow-xl shadow-indigo-500/10 overflow-hidden rounded-xl h-full flex flex-col w-full">
        <CardContent className="p-6 flex flex-col h-full w-full">
          <h2 className="text-xl font-semibold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Contributors</h2>
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
        <h2 className="text-xl font-semibold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Contributors</h2>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-4 w-full">
          {contributors.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-slate-400">No contributors found for this repository.</p>
            </div>
          ) : (
            contributors.map((contributor) => {
              const contributionPercentage = (contributor.contributions / totalContributions) * 100

              return (
                <Card key={contributor.id} className="border border-indigo-500/20 bg-black/60 backdrop-blur-md hover:border-indigo-500/30 transition-all duration-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={contributor.avatar_url || "/placeholder.svg"} />
                        <AvatarFallback>{contributor.login.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-2">
                          <a
                            href={contributor.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium hover:text-purple-400 transition-colors"
                          >
                            {contributor.login}
                          </a>
                          <span className="text-sm text-white/60">
                            {contributor.contributions} commits ({contributionPercentage.toFixed(1)}%)
                          </span>
                        </div>

                        <Progress
                          value={contributionPercentage}
                          className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-purple-600 [&>div]:to-blue-500"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
