"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/components/supabase-provider"
import DashboardLayout from "@/components/dashboard-layout"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, GitMerge, MessageSquare } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { AuthLoading } from "@/components/auth-loading"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

type PullRequest = {
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
  repository: {
    id: number
    name: string
    full_name: string
  }
  labels: Array<{
    id: number
    name: string
    color: string
  }>
  merged: boolean
}

type RepoStats = {
  name: string
  fullName: string
  count: number
  color: string
}

export default function PullRequestsPage() {
  const { user, loading: userLoading } = useSupabase()
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showLoading, setShowLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [repoStats, setRepoStats] = useState<RepoStats[]>([])
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'status' | 'repository'>('repository')
  
  // Sophisticated gradient color palette
  const GRADIENTS = [
    ['#3B82F6', '#2563EB'], // blue gradient
    ['#6366F1', '#4F46E5'], // indigo gradient
    ['#8B5CF6', '#7C3AED'], // violet gradient
    ['#EC4899', '#DB2777'], // pink gradient
    ['#06B6D4', '#0891B2'], // cyan gradient
    ['#10B981', '#059669'], // emerald gradient
    ['#F59E0B', '#D97706'], // amber gradient
    ['#6EE7B7', '#34D399'], // teal gradient
    ['#9333EA', '#7E22CE']  // purple gradient
  ]

  // Show loading animation immediately when component mounts or user changes
  useEffect(() => {
    setShowLoading(true)
    setLoading(true)
  }, [])

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login")
    }
  }, [user, userLoading, router])

  useEffect(() => {
    async function fetchPullRequests() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          console.error("No session found")
          return
        }

        // First fetch the list of user's repositories
        const reposResponse = await fetch("https://api.github.com/user/repos", {
          headers: {
            Authorization: `Bearer ${session.provider_token}`,
          },
        })

        if (!reposResponse.ok) {
          throw new Error("Failed to fetch repositories")
        }

        const repos = await reposResponse.json()
        
        // Then fetch all PRs authored by the user
        const response = await fetch(`https://api.github.com/search/issues?q=author:${user?.user_metadata?.user_name}+type:pr&per_page=100`, {
          headers: {
            Authorization: `Bearer ${session.provider_token}`,
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch pull requests")
        }

        const data = await response.json()
        
        // Process the PRs and calculate repo stats
        const prs = data.items.map((item: any) => {
          // Extract repo info from PR URL (format: https://api.github.com/repos/owner/repo/pulls/123)
          const urlParts = item.repository_url.split('/')
          const repoName = urlParts[urlParts.length - 1]
          const repoOwner = urlParts[urlParts.length - 2]
          const fullName = `${repoOwner}/${repoName}`
          
          return {
            id: item.id,
            number: item.number,
            title: item.title,
            state: item.state,
            html_url: item.html_url,
            created_at: item.created_at,
            updated_at: item.updated_at,
            comments: item.comments,
            user: {
              login: item.user.login,
              avatar_url: item.user.avatar_url
            },
            repository: {
              id: item.id,
              name: repoName,
              full_name: fullName
            },
            labels: item.labels || [],
            merged: item.pull_request?.merged || false
          }
        })
        
        // Calculate stats per repository
        const statsMap = new Map<string, number>()
        prs.forEach((pr: PullRequest) => {
          const repoName = pr.repository.full_name
          statsMap.set(repoName, (statsMap.get(repoName) || 0) + 1)
        })
        
        const stats = Array.from(statsMap.entries()).map(([fullName, count], index) => {
          const parts = fullName.split('/')
          return {
            name: parts[1], // repo name
            fullName,
            count,
            color: GRADIENTS[index % GRADIENTS.length][0]
          }
        }).sort((a, b) => b.count - a.count) // Sort by count descending
        
        setRepoStats(stats)
        
        // Sort PRs: first open, then merged, then closed
        const sortedPRs = [...prs].sort((a, b) => {
          // First by state (open first)
          if (a.state === 'open' && b.state !== 'open') return -1
          if (a.state !== 'open' && b.state === 'open') return 1
          
          // Then by merged status (merged second)
          if (a.merged && !b.merged) return -1
          if (!a.merged && b.merged) return 1
          
          // Finally by date (newest first)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
        
        setPullRequests(sortedPRs)
      } catch (error) {
        console.error("Error fetching pull requests:", error)
        setError("Failed to load your pull requests. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchPullRequests()
    }
  }, [user, supabase])

  if (userLoading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-60 w-full rounded-lg" />
            <Skeleton className="h-60 w-full rounded-lg" />
          </div>
          <div className="mt-6 space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <>
      {loading && <AuthLoading message="Fetching your Pull Requests" />}
      <div className={loading ? "hidden" : "block"}>
        <DashboardLayout>
          <div className="p-8 bg-gradient-to-br from-black via-[#0a0a0a] to-black min-h-screen w-full">
            <div className="max-w-[2000px] mx-auto">
              <h1 className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500">Your Pull Requests</h1>

              {error && (
                <Alert variant="destructive" className="mb-6 border-2 border-red-500/20 bg-red-500/10">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Stats Section */}
              <div className="grid grid-cols-1 gap-6 mb-10">
                {/* Tabs */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveTab('repository')}
                    className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                      activeTab === 'repository'
                        ? 'bg-gradient-to-r from-slate-900/80 to-slate-800/80 text-blue-400 shadow-lg shadow-black/20 border border-slate-700/50'
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    PRs by Repository
                  </button>
                  <button
                    onClick={() => setActiveTab('status')}
                    className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                      activeTab === 'status'
                        ? 'bg-gradient-to-r from-slate-900/80 to-slate-800/80 text-blue-400 shadow-lg shadow-black/20 border border-slate-700/50'
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    PRs by Status
                  </button>
                </div>

                {activeTab === 'repository' ? (
                  <Card className="border border-indigo-500/20 bg-black/80 backdrop-blur-xl shadow-xl shadow-indigo-500/10">
                    <CardHeader className="border-b border-indigo-500/20 pb-3">
                      <CardTitle className="text-xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                        Pull Requests by Repository
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-8">
                      <div className="flex items-center justify-between gap-8 h-[500px]">
                        <div className="h-full w-[500px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <defs>
                                {GRADIENTS.map((colors, index) => (
                                  <linearGradient
                                    key={`gradient-${index}`}
                                    id={`gradient-repo-${index}`}
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                  >
                                    <stop offset="0%" stopColor={colors[0]} stopOpacity={0.95} />
                                    <stop offset="100%" stopColor={colors[1]} stopOpacity={0.9} />
                                  </linearGradient>
                                ))}
                              </defs>
                              <Pie
                                data={repoStats}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={activeIndex !== null ? 160 : 150}
                                paddingAngle={3}
                                dataKey="count"
                                nameKey="name"
                                onMouseEnter={(_, index) => {
                                  setActiveIndex(index)
                                }}
                                onMouseLeave={() => {
                                  setActiveIndex(null)
                                }}
                              >
                                {repoStats.map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`}
                                    fill={`url(#gradient-repo-${index % GRADIENTS.length})`}
                                    stroke={activeIndex === index ? GRADIENTS[index % GRADIENTS.length][0] : 'none'}
                                    strokeWidth={activeIndex === index ? 2 : 0}
                                    style={{
                                      filter: activeIndex === index 
                                        ? `drop-shadow(0 0 8px ${GRADIENTS[index % GRADIENTS.length][0]}80)`
                                        : 'none',
                                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                      cursor: 'pointer',
                                      opacity: activeIndex === null || activeIndex === index ? 1 : 0.5
                                    }}
                                  />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="flex-1 space-y-3 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                          {repoStats.map((entry, index) => (
                            <div 
                              key={entry.name}
                              className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                                activeIndex === index 
                                  ? 'bg-slate-800/50 shadow-lg shadow-indigo-500/10' 
                                  : 'hover:bg-slate-800/30'
                              }`}
                              onMouseEnter={() => setActiveIndex(index)}
                              onMouseLeave={() => setActiveIndex(null)}
                              style={{
                                cursor: 'pointer'
                              }}
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{
                                    background: `linear-gradient(to bottom right, ${GRADIENTS[index % GRADIENTS.length][0]}, ${GRADIENTS[index % GRADIENTS.length][1]})`,
                                    boxShadow: activeIndex === index 
                                      ? `0 0 12px ${GRADIENTS[index % GRADIENTS.length][0]}80` 
                                      : 'none'
                                  }}
                                />
                                <span className="font-medium text-slate-200">{entry.name}</span>
                              </div>
                              <div className="flex items-center gap-3 text-sm">
                                <span className="text-slate-400">{entry.count} PRs</span>
                                <span className="text-slate-500">•</span>
                                <span className="text-slate-400 w-[60px] text-right">
                                  {((entry.count / pullRequests.length) * 100).toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border border-indigo-500/20 bg-black/80 backdrop-blur-xl shadow-xl shadow-indigo-500/10">
                    <CardHeader className="border-b border-indigo-500/20 pb-3">
                      <CardTitle className="text-lg text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                        Pull Requests by Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-8">
                      <div className="flex items-center justify-between gap-8 h-[500px]">
                        <div className="h-full w-[500px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <defs>
                                {GRADIENTS.map((colors, index) => (
                                  <linearGradient
                                    key={`gradient-${index}`}
                                    id={`gradient-${index}`}
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                  >
                                    <stop offset="0%" stopColor={colors[0]} stopOpacity={0.95} />
                                    <stop offset="100%" stopColor={colors[1]} stopOpacity={0.9} />
                                  </linearGradient>
                                ))}
                              </defs>
                              <Pie
                                data={[
                                  { name: 'Open', value: pullRequests.filter(pr => pr.state === 'open').length },
                                  { name: 'Merged', value: pullRequests.filter(pr => pr.merged || pr.state === 'closed').length }
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={activeIndex !== null ? 160 : 150}
                                paddingAngle={3}
                                dataKey="value"
                                onMouseEnter={(_, index) => {
                                  setActiveIndex(index)
                                }}
                                onMouseLeave={() => {
                                  setActiveIndex(null)
                                }}
                              >
                                {[0, 1].map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`}
                                    fill={`url(#gradient-${index})`}
                                    stroke={activeIndex === index ? GRADIENTS[index][0] : 'none'}
                                    strokeWidth={activeIndex === index ? 2 : 0}
                                    style={{
                                      filter: activeIndex === index 
                                        ? `drop-shadow(0 0 8px ${GRADIENTS[index][0]}80)`
                                        : 'none',
                                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                      cursor: 'pointer',
                                      opacity: activeIndex === null || activeIndex === index ? 1 : 0.5
                                    }}
                                  />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="flex-1 space-y-3">
                          <div className="space-y-4">
                            <div 
                              className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                                activeIndex === 0 
                                  ? 'bg-slate-800/50 shadow-lg shadow-indigo-500/10' 
                                  : 'hover:bg-slate-800/30'
                              }`}
                              onMouseEnter={() => setActiveIndex(0)}
                              onMouseLeave={() => setActiveIndex(null)}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{
                                    background: `linear-gradient(to bottom right, ${GRADIENTS[0][0]}, ${GRADIENTS[0][1]})`,
                                    boxShadow: activeIndex === 0 
                                      ? `0 0 12px ${GRADIENTS[0][0]}80` 
                                      : 'none'
                                  }}
                                />
                                <span className="font-medium text-slate-200">Open PRs</span>
                              </div>
                              <div className="flex items-center gap-3 text-sm">
                                <span className="text-slate-400">
                                  {pullRequests.filter(pr => pr.state === 'open').length} PRs
                                </span>
                                <span className="text-slate-500">•</span>
                                <span className="text-slate-400 w-[60px] text-right">
                                  {((pullRequests.filter(pr => pr.state === 'open').length / pullRequests.length) * 100).toFixed(1)}%
                                </span>
                              </div>
                            </div>

                            <div 
                              className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                                activeIndex === 1 
                                  ? 'bg-slate-800/50 shadow-lg shadow-indigo-500/10' 
                                  : 'hover:bg-slate-800/30'
                              }`}
                              onMouseEnter={() => setActiveIndex(1)}
                              onMouseLeave={() => setActiveIndex(null)}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{
                                    background: `linear-gradient(to bottom right, ${GRADIENTS[1][0]}, ${GRADIENTS[1][1]})`,
                                    boxShadow: activeIndex === 1 
                                      ? `0 0 12px ${GRADIENTS[1][0]}80` 
                                      : 'none'
                                  }}
                                />
                                <span className="font-medium text-slate-200">Merged PRs</span>
                              </div>
                              <div className="flex items-center gap-3 text-sm">
                                <span className="text-slate-400">
                                  {pullRequests.filter(pr => pr.merged || pr.state === 'closed').length} PRs
                                </span>
                                <span className="text-slate-500">•</span>
                                <span className="text-slate-400 w-[60px] text-right">
                                  {((pullRequests.filter(pr => pr.merged || pr.state === 'closed').length / pullRequests.length) * 100).toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Pull Requests List */}
              <div className="space-y-6">
                {pullRequests.length === 0 ? (
                  <div className="text-center py-16 bg-black/80 backdrop-blur-xl border border-indigo-500/20 rounded-xl shadow-lg">
                    <h3 className="text-2xl font-medium mb-3 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">No pull requests found</h3>
                    <p className="text-slate-400 mb-6">You haven't created any pull requests yet.</p>
                  </div>
                ) : (
                  <>
                    {/* Open PRs Section */}
                    {pullRequests.some(pr => pr.state === 'open') && (
                      <div className="mb-10">
                        <h2 className="text-xl font-semibold mb-5 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Open Pull Requests</h2>
                        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                          {pullRequests.filter(pr => pr.state === 'open').map((pr) => (
                            <PRCard key={pr.id} pr={pr} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Merged PRs Section */}
                    {pullRequests.some(pr => pr.merged || pr.state === 'closed') && (
                      <div className="mb-10">
                        <h2 className="text-xl font-semibold mb-5 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Merged Pull Requests</h2>
                        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                          {pullRequests.filter(pr => pr.merged || pr.state === 'closed').map((pr) => (
                            <PRCard key={pr.id} pr={pr} />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </DashboardLayout>
      </div>
    </>
  )
}

// PR Card Component
function PRCard({ pr }: { pr: PullRequest }) {
  return (
    <Card className="group border border-indigo-500/20 bg-black/80 backdrop-blur-xl shadow-lg hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 rounded-xl overflow-hidden">
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-start gap-2 mb-3">
              <h3 className="font-medium">
                <a
                  href={pr.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-cyan-400 transition-all duration-300"
                >
                  {pr.title}
                </a>
              </h3>
              {pr.merged || pr.state === 'closed' ? (
                <Badge className="bg-gradient-to-r from-indigo-500 to-indigo-600 border-none">merged</Badge>
              ) : (
                <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 border-none">
                  open
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {pr.labels.map((label) => (
                <Badge
                  key={label.id}
                  style={{
                    backgroundColor: `#${label.color}10`,
                    color: `#${label.color}`,
                    borderColor: `#${label.color}30`,
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                  }}
                  variant="outline"
                  className="ring-1 ring-white/10"
                >
                  {label.name}
                </Badge>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="bg-gradient-to-r from-slate-900/80 to-slate-800/80 backdrop-blur-xl text-slate-300 border-indigo-500/20 group-hover:border-indigo-500/30 transition-colors">
                  {pr.repository.name}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <GitMerge className="w-4 h-4 text-cyan-400" />
                <span>#{pr.number}</span>
              </div>
              <span>{formatDistanceToNow(new Date(pr.created_at), { addSuffix: true })}</span>
              <div className="flex items-center gap-1">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <span>{pr.comments}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 