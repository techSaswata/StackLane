"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSupabase } from "@/components/supabase-provider"
import DashboardLayout from "@/components/dashboard-layout"
import { RepoCard } from "@/components/repo-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { GitPullRequest, GitMerge, Circle, CheckCircle2, Star, GitFork } from "lucide-react"
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, BarChart, Bar } from "recharts"
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

type GitHubStats = {
  totalCommits: number
  closedIssues: number
  totalPRs: number
  mergedPRs: number
  ongoingPRs: number
  languages: { [key: string]: number }
  prStats: {
    merged: number
    closed: number
    open: number
  }
  contributionData: {
    dates: string[]
    counts: number[]
  }
  totalStars: number
  currentStreak: number
  longestStreak: number
  totalContributions: number
  contributedRepos: number
  contributionStartDate: string
  currentStreakDate: string
  longestStreakRange: string
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardContent() {
  return (
    <Suspense fallback={<div>Loading content...</div>}>
      <DashboardMainContent />
    </Suspense>
  )
}

function DashboardMainContent() {
  const searchParams = useSearchParams()
  const { user, loading: userLoading } = useSupabase()
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<GitHubStats | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login")
    }
  }, [user, userLoading, router])

  useEffect(() => {
    // Initial loading animation
    const timer = setTimeout(() => {
      setInitialLoading(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const fetchRepositories = async () => {
      if (!user) return

      try {
        setLoading(true)
        const response = await fetch("/api/github/repos")

        if (!response.ok) {
          console.error("Error fetching repositories:", {
            status: response.status,
            statusText: response.statusText,
          })
          throw new Error("Failed to fetch repositories")
        }

        const data = await response.json()
        setRepositories(data)
      } catch (err) {
        console.error("An error occurred while fetching repositories:", err)
        setError("Failed to load your repositories. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchRepositories()
    }
  }, [user])

  useEffect(() => {
    async function fetchGitHubStats() {
      try {
        // Fetch user's GitHub stats here
        // This is a placeholder for demo data
        const demoStats: GitHubStats = {
          totalCommits: 265,
          closedIssues: 48,
          totalPRs: 86,
          mergedPRs: 72,
          ongoingPRs: 8,
          languages: {
            HTML: 32.31,
            Java: 30.88,
            JavaScript: 25.17,
            CSS: 8.37,
            "C++": 1.92,
            TypeScript: 1.34
          },
          prStats: {
            merged: 72,
            closed: 6,
            open: 8
          },
          contributionData: {
            dates: ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr"],
            counts: [20, 15, 10, 25, 30, 45, 35, 40, 50, 45, 55, 60, 65]
          },
          totalStars: 1,
          currentStreak: 1,
          longestStreak: 9,
          totalContributions: 191,
          contributedRepos: 7,
          contributionStartDate: "Aug 7, 2024",
          currentStreakDate: "Apr 19",
          longestStreakRange: "Dec 8, 2024 - Dec 16, 2024"
        }
        setStats(demoStats)
      } catch (error) {
        console.error("Error fetching GitHub stats:", error)
        setError("Failed to load your GitHub statistics. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchGitHubStats()
    }
  }, [user])

  if (initialLoading) {
    return (
      <div className="w-full h-screen">
        <AuthLoading message="Customising your Dashboard" />
      </div>
    )
  }

  if (userLoading || loading) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6 w-full">
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-6 w-full">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 w-full">
        {/* Profile Overview */}
        <div className="flex items-center gap-6 bg-[#111] border border-[#222] rounded-lg p-6 w-full">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback>GH</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              {user?.user_metadata?.full_name}
            </h1>
            <p className="text-slate-400">@{user?.user_metadata?.user_name}</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="bg-[#111] border-[#222]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                Total Commits
              </CardTitle>
              <GitMerge className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats?.totalCommits}</div>
              <p className="text-xs text-slate-400">Last year</p>
            </CardContent>
          </Card>
          <Card className="bg-[#111] border-[#222]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                Pull Requests
              </CardTitle>
              <GitPullRequest className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats?.mergedPRs}/{stats?.totalPRs}</div>
              <p className="text-xs text-slate-400">Merged/Total</p>
            </CardContent>
          </Card>
          <Card className="bg-[#111] border-[#222]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-teal-400">
                Issues Closed
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats?.closedIssues}</div>
              <p className="text-xs text-slate-400">Total closed</p>
            </CardContent>
          </Card>
        </div>

        {/* Contribution Graph */}
        <Card className="bg-[#111] border-[#222]">
          <CardHeader>
            <CardTitle className="text-white">Contribution Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stats?.contributionData.dates.map((date, index) => ({
                    date,
                    contributions: stats.contributionData.counts[index]
                  }))}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorContributions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9333ea" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    stroke="#666"
                    tick={{ fill: '#fff' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111',
                      border: '1px solid #222',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    labelStyle={{ color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="contributions"
                    stroke="#9333ea"
                    fillOpacity={1}
                    fill="url(#colorContributions)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Language Distribution & PR Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Most Used Languages Card */}
          <Card className="bg-[#111] border-[#222]">
            <CardHeader>
              <CardTitle className="text-white">Most Used Languages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'HTML', value: stats?.languages?.HTML || 0, color: '#e34c26' },
                        { name: 'Java', value: stats?.languages?.Java || 0, color: '#b07219' },
                        { name: 'JavaScript', value: stats?.languages?.JavaScript || 0, color: '#f1e05a' },
                        { name: 'CSS', value: stats?.languages?.CSS || 0, color: '#563d7c' },
                        { name: 'C++', value: stats?.languages?.["C++"] || 0, color: '#f34b7d' },
                        { name: 'TypeScript', value: stats?.languages?.TypeScript || 0, color: '#3178c6' }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      labelLine={{ stroke: '#555', strokeWidth: 1, opacity: 0.8 }}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(2)}%`}
                    >
                      {[
                        { color: '#e34c26', opacity: 0.8 }, // HTML - orange-red
                        { color: '#b07219', opacity: 0.8 }, // Java - brown
                        { color: '#f1e05a', opacity: 0.8 }, // JavaScript - yellow
                        { color: '#563d7c', opacity: 0.8 }, // CSS - purple
                        { color: '#f34b7d', opacity: 0.8 }, // C++ - pink
                        { color: '#3178c6', opacity: 0.8 }  // TypeScript - blue
                      ].map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color} 
                          fillOpacity={entry.opacity}
                          stroke="#222"
                          strokeWidth={1}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(17, 17, 17, 0.9)',
                        border: '1px solid #222',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value, name) => [`${value}%`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#111] border-[#222]">
            <CardHeader>
              <CardTitle className="text-white">Pull Request Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Merged', value: stats?.prStats.merged || 0 },
                      { name: 'Closed', value: stats?.prStats.closed || 0 },
                      { name: 'Open', value: stats?.prStats.open || 0 }
                    ]}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    onMouseMove={(e) => {
                      if (e?.isTooltipActive) {
                        const el = document.querySelector(`[data-bar-index="${e.activeTooltipIndex}"]`);
                        if (el) {
                          el.classList.add('animate-pulse-subtle');
                        }
                      } else {
                        document.querySelectorAll('[data-bar-index]').forEach(el => {
                          el.classList.remove('animate-pulse-subtle');
                        });
                      }
                    }}
                  >
                    <XAxis
                      dataKey="name"
                      stroke="#666"
                      tick={{ fill: '#fff' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <Tooltip
                      cursor={false}
                      contentStyle={{
                        backgroundColor: '#111',
                        border: '1px solid #222',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      labelStyle={{ color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar
                      dataKey="value"
                      radius={[4, 4, 0, 0]}
                    >
                      {[
                        { name: 'Merged', color: '#9333ea' },
                        { name: 'Closed', color: '#ef4444' },
                        { name: 'Open', color: '#3b82f6' }
                      ].map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          style={{ filter: 'brightness(1)' }}
                          className="transition-all duration-300 hover:filter hover:brightness-125"
                          data-bar-index={index}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Developer Stats Card */}
        <Card className="bg-[#111] border-[#222]">
          <CardHeader>
            <CardTitle className="text-white text-2xl">{user?.user_metadata?.full_name}'s GitHub Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <Star className="h-6 w-6 text-yellow-400" />
                  <span className="text-lg text-cyan-300">Total Stars Earned:</span>
                  <span className="text-lg font-bold text-white">{stats?.totalStars}</span>
                </div>
                <div className="flex items-center gap-3">
                  <GitMerge className="h-6 w-6 text-purple-400" />
                  <span className="text-lg text-blue-300">Total Commits (2025):</span>
                  <span className="text-lg font-bold text-white">{stats?.totalCommits}</span>
                </div>
                <div className="flex items-center gap-3">
                  <GitPullRequest className="h-6 w-6 text-green-400" />
                  <span className="text-lg text-emerald-300">Total PRs:</span>
                  <span className="text-lg font-bold text-white">{stats?.totalPRs}</span>
                </div>
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-6 w-6 text-amber-400" />
                  <span className="text-lg text-orange-300">Total Issues:</span>
                  <span className="text-lg font-bold text-white">{stats?.closedIssues}</span>
                </div>
                <div className="flex items-center gap-3">
                  <GitFork className="h-6 w-6 text-teal-400" />
                  <span className="text-lg text-indigo-300">Contributed to (last year):</span>
                  <span className="text-lg font-bold text-white">{stats?.contributedRepos}</span>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative h-48 w-48">
                  <div className="absolute inset-0 rounded-full border-4 border-[#222]"></div>
                  <svg className="absolute inset-0" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#222"
                      strokeWidth="10"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="url(#gradient)"
                      strokeWidth="10"
                      strokeDasharray="282.7"
                      strokeDashoffset="42.4"
                      transform="rotate(-90 50 50)"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="50%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-6xl font-bold text-cyan-300">C+</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contribution Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-[#111] border-[#222]">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <h3 className="text-5xl font-bold text-purple-500 mb-4">{stats?.totalContributions}</h3>
              <p className="text-lg text-blue-300">Total Contributions</p>
              <p className="text-sm text-gray-400 mt-2">{stats?.contributionStartDate} - Present</p>
            </CardContent>
          </Card>
          
          <Card className="bg-[#111] border-[#222]">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="h-20 w-20 rounded-full border-4 border-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 flex items-center justify-center mb-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                <span className="text-4xl font-bold text-amber-400">{stats?.currentStreak}</span>
              </div>
              <p className="text-lg text-teal-300">Current Streak</p>
              <p className="text-sm text-gray-400 mt-2">{stats?.currentStreakDate}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-[#111] border-[#222]">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <h3 className="text-5xl font-bold text-cyan-500 mb-4">{stats?.longestStreak}</h3>
              <p className="text-lg text-indigo-300">Longest Streak</p>
              <p className="text-sm text-gray-400 mt-2">{stats?.longestStreakRange}</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <h2 className="text-2xl font-bold mb-6 text-white">Your Repositories</h2>

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
            <p className="text-white/60 mb-6">You don't have any repositories on GitHub or we couldn't access them.</p>
            <a
              href="https://github.com/new"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-md hover:opacity-90 transition-all text-sm font-semibold"
            >
              Create a new repository
            </a>
          </div>
        )}
        </div>
      </div>
    </DashboardLayout>
  )
}
