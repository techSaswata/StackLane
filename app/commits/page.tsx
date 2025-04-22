"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/components/supabase-provider"
import DashboardLayout from "@/components/dashboard-layout"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, GitCommit, Calendar, Clock } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { AuthLoading } from "@/components/auth-loading"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow, format } from "date-fns"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

type Commit = {
  sha: string
  commit: {
    message: string
    author: {
      name: string
      email: string
      date: string
    }
  }
  html_url: string
  repository: {
    name: string
    full_name: string
  }
}

type CommitStats = {
  commitsPerRepo: { name: string; value: number }[]
  commitsPerMonth: { name: string; commits: number }[]
  currentStreak: number
  totalCommits: number
  lastCommitDate: string
}

const loadingMessages = [
  "Oh! Tooooo many commits 😵‍💫",
  "Hold on a Sec Captain Commit",
  "Made with ❤️ by Techy",
];

export default function CommitsPage() {
  const { user, loading: userLoading } = useSupabase()
  const [commits, setCommits] = useState<Commit[]>([])
  const [stats, setStats] = useState<CommitStats>({
    commitsPerRepo: [],
    commitsPerMonth: [],
    currentStreak: 0,
    totalCommits: 0,
    lastCommitDate: ""
  })
  const [loading, setLoading] = useState(true)
  const [showLoading, setShowLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'repository' | 'monthly'>('repository')
  const [activeBarIndex, setActiveBarIndex] = useState<number | null>(null)
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)

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

    // Set up message rotation
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % loadingMessages.length)
    }, 1000)

    return () => clearInterval(messageInterval)
  }, [])

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login")
    }
  }, [user, userLoading, router])

  useEffect(() => {
    async function fetchCommits() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.error("No session found");
          setError("Please sign in again to access your commits.");
          router.push("/login");
          return;
        }

        if (!session.provider_token) {
          console.error("No GitHub token found");
          setError("GitHub access token not found. Please sign in again.");
          router.push("/login");
          return;
        }

        // First fetch user information to get GitHub username
        const userResponse = await fetch("https://api.github.com/user", {
          headers: {
            Authorization: `Bearer ${session.provider_token}`,
            Accept: "application/vnd.github.v3+json",
          },
        });

        if (!userResponse.ok) {
          throw new Error(`Failed to fetch user info: ${userResponse.statusText}`);
        }

        const userData = await userResponse.json();
        const username = userData.login;

        // Approach 1: Fetch user's own repositories
        const reposResponse = await fetch("https://api.github.com/user/repos", {
          headers: {
            Authorization: `Bearer ${session.provider_token}`,
            Accept: "application/vnd.github.v3+json",
          },
        });

        if (!reposResponse.ok) {
          if (reposResponse.status === 401 || reposResponse.status === 403) {
            await supabase.auth.signOut();
            router.push("/login?message=Your%20GitHub%20session%20has%20expired.%20Please%20re-authenticate.");
            return;
          }
          throw new Error(`Failed to fetch repos: ${reposResponse.statusText}`);
        }

        const repos = await reposResponse.json();
        
        // Approach 2: Search for commits by the user across all GitHub
        // This will find commits in repositories you don't own and haven't forked
        const searchCommitsResponse = await fetch(
          `https://api.github.com/search/commits?q=author:${username}&sort=author-date&order=desc&per_page=100`,
          {
            headers: {
              Authorization: `Bearer ${session.provider_token}`,
              Accept: "application/vnd.github.cloak-preview", // Required for commits search
            },
          }
        );

        if (!searchCommitsResponse.ok) {
          throw new Error(`Failed to search commits: ${searchCommitsResponse.statusText}`);
        }

        const searchCommitsData = await searchCommitsResponse.json();
        
        // Process and store all commits
        const allCommits: Commit[] = [];
        const commitsPerRepo: { [key: string]: number } = {};
        const commitsPerMonth: { [key: string]: number } = {};
        const processedCommits = new Set(); // To avoid duplicates

        // Process commits from user's own repositories
        for (const repo of repos) {
          try {
            const commitsResponse = await fetch(
              `https://api.github.com/repos/${repo.full_name}/commits?author=${username}&per_page=100`,
              {
                headers: {
                  Authorization: `Bearer ${session.provider_token}`,
                  Accept: "application/vnd.github.v3+json",
                },
              }
            );

            if (commitsResponse.ok) {
              const repoCommits = await commitsResponse.json();
              
              for (const commit of repoCommits) {
                const commitKey = `${commit.sha}-${repo.full_name}`;
                
                if (!processedCommits.has(commitKey)) {
                  processedCommits.add(commitKey);
                  
                  // Add repository information to the commit
                  commit.repository = { name: repo.name, full_name: repo.full_name };
                  allCommits.push(commit);
                  
                  // Count commits per repo
                  commitsPerRepo[repo.name] = (commitsPerRepo[repo.name] || 0) + 1;
                  
                  // Count commits per month
                  const monthYear = format(new Date(commit.commit.author.date), 'MMM yyyy');
                  commitsPerMonth[monthYear] = (commitsPerMonth[monthYear] || 0) + 1;
                }
              }
            } else {
              console.warn(`Failed to fetch commits for ${repo.full_name}:`, {
                status: commitsResponse.status,
                statusText: commitsResponse.statusText,
              });
            }
          } catch (error) {
            console.error(`Error fetching commits for ${repo.full_name}:`, error);
          }
        }

        // Process commits from search results (repositories you don't own but have contributed to)
        if (searchCommitsData.items && searchCommitsData.items.length > 0) {
          for (const item of searchCommitsData.items) {
            try {
              // Extract repository information from the commit URL
              // URL format: https://api.github.com/repos/{owner}/{repo}/commits/{sha}
              const urlParts = item.url.split('/');
              const repoOwner = urlParts[4];
              const repoName = urlParts[5];
              const repoFullName = `${repoOwner}/${repoName}`;
              
              // Skip if this is user's own repository (already processed above)
              if (repos.some((repo: { full_name: string }) => repo.full_name === repoFullName)) {
                continue;
              }
              
              const commitKey = `${item.sha}-${repoFullName}`;
              if (!processedCommits.has(commitKey)) {
                processedCommits.add(commitKey);
                
                // Get detailed commit information
                const commitResponse = await fetch(
                  `https://api.github.com/repos/${repoFullName}/commits/${item.sha}`,
                  {
                    headers: {
                      Authorization: `Bearer ${session.provider_token}`,
                      Accept: "application/vnd.github.v3+json",
                    },
                  }
                );
                
                if (commitResponse.ok) {
                  const commitData = await commitResponse.json();
                  
                  // Add repository information
                  commitData.repository = { 
                    name: repoName, 
                    full_name: repoFullName 
                  };
                  
                  allCommits.push(commitData);
                  
                  // Count commits per repo
                  commitsPerRepo[repoName] = (commitsPerRepo[repoName] || 0) + 1;
                  
                  // Count commits per month
                  const monthYear = format(new Date(commitData.commit.author.date), 'MMM yyyy');
                  commitsPerMonth[monthYear] = (commitsPerMonth[monthYear] || 0) + 1;
                }
              }
            } catch (error) {
              console.error(`Error processing search commit:`, error);
            }
          }
        }

        // Sort commits by date in descending order (newest first)
        allCommits.sort((a, b) => {
          const dateA = new Date(a.commit.author.date).getTime();
          const dateB = new Date(b.commit.author.date).getTime();
          return dateB - dateA;
        });

        // Format data for charts
        const commitsPerRepoData = Object.entries(commitsPerRepo)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);

        const commitsPerMonthData = Object.entries(commitsPerMonth)
          .map(([name, commits]) => ({ name, commits }))
          .sort((a, b) => new Date(b.name).getTime() - new Date(a.name).getTime())
          .slice(0, 12)
          .reverse();

        // Calculate streak (keeping your original streak calculation)
        const sortedDates = allCommits
          .map((c) => {
            const date = new Date(c.commit.author.date);
            date.setHours(0, 0, 0, 0);
            return date;
          })
          .sort((a, b) => b.getTime() - a.getTime());

        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (sortedDates.length > 0) {
          let currentDate = new Date(today);
          let hasCommitToday = false;

          // Check if there's a commit today
          hasCommitToday = sortedDates.some(date => date.getTime() === today.getTime());

          if (hasCommitToday) {
            streak = 1;
            currentDate.setDate(currentDate.getDate() - 1);

            // Count backwards until we find a day without commits
            while (sortedDates.some(date => date.getTime() === currentDate.getTime())) {
              streak++;
              currentDate.setDate(currentDate.getDate() - 1);
            }
          } else {
            // If no commit today, check if there was a commit yesterday
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            if (sortedDates.some(date => date.getTime() === yesterday.getTime())) {
              streak = 1;
              currentDate = new Date(yesterday);
              currentDate.setDate(currentDate.getDate() - 1);

              // Count backwards until we find a day without commits
              while (sortedDates.some(date => date.getTime() === currentDate.getTime())) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
              }
            }
          }
        }

        setCommits(allCommits);
        setStats({
          commitsPerRepo: commitsPerRepoData,
          commitsPerMonth: commitsPerMonthData,
          currentStreak: streak,
          totalCommits: allCommits.length,
          lastCommitDate: allCommits[0]?.commit.author.date || "",
        });
      } catch (error) {
        console.error("Error fetching commits:", error);
        setError("Failed to load your commits. Please try again later.");
      } finally {
        setLoading(false);
        setTimeout(() => {
          setShowLoading(false);
        }, 2000);
      }
    }

    if (user) {
      fetchCommits();
    }
  }, [user, supabase]);

  return (
    <>
      {showLoading && <AuthLoading message={loadingMessages[currentMessageIndex]} />}
      <div className={showLoading ? "hidden" : "block"}>
        <DashboardLayout>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Your Commits</h1>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="bg-gradient-to-r from-slate-900/80 to-slate-800/80 backdrop-blur-xl text-slate-300 border-indigo-500/20 px-4 py-2">
                  <GitCommit className="w-4 h-4 mr-2 text-cyan-400" />
                  {stats.totalCommits} total commits
                </Badge>
                <Badge variant="outline" className="bg-gradient-to-r from-slate-900/80 to-slate-800/80 backdrop-blur-xl text-slate-300 border-indigo-500/20 px-4 py-2">
                  <Calendar className="w-4 h-4 mr-2 text-purple-400" />
                  {stats.currentStreak} day streak
                </Badge>
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-6 mb-8">
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
                  Commits per Repository
                </button>
                <button
                  onClick={() => setActiveTab('monthly')}
                  className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                    activeTab === 'monthly'
                      ? 'bg-gradient-to-r from-slate-900/80 to-slate-800/80 text-blue-400 shadow-lg shadow-black/20 border border-slate-700/50'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Commits per Month
                </button>
              </div>

              {/* Chart Cards */}
              {activeTab === 'repository' ? (
                <Card className="border border-indigo-500/20 bg-black/80 backdrop-blur-xl shadow-xl shadow-indigo-500/10">
                  <CardHeader>
                    <CardTitle className="text-lg text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                      Repository Commit Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-8 h-auto lg:h-[500px]">
                      <div className="h-[400px] lg:h-full w-full lg:w-[500px]">
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
                              data={stats.commitsPerRepo}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={80}
                              outerRadius={activeIndex !== null ? 160 : 150}
                              paddingAngle={3}
                              onMouseEnter={(_, index) => {
                                setActiveIndex(index)
                              }}
                              onMouseLeave={() => {
                                setActiveIndex(null)
                              }}
                            >
                              {stats.commitsPerRepo.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={`url(#gradient-${index % GRADIENTS.length})`}
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

                      <div className="flex-1 w-full space-y-3 max-h-[300px] lg:max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                        {stats.commitsPerRepo.map((entry, index) => (
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
                              <span className="text-slate-400">{entry.value} commits</span>
                              <span className="text-slate-500">•</span>
                              <span className="text-slate-400 w-[60px] text-right">
                                {((entry.value / (stats.totalCommits || 1)) * 100).toFixed(1)}%
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
                  <CardHeader>
                    <CardTitle className="text-lg text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                      Monthly Commit Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px] lg:h-[500px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.commitsPerMonth}>
                          <defs>
                            {GRADIENTS.map((colors, index) => (
                              <linearGradient
                                key={`gradient-bar-${index}`}
                                id={`gradient-bar-${index}`}
                                x1="0"
                                y1="1"
                                x2="0"
                                y2="0"
                              >
                                <stop offset="0%" stopColor={colors[0]} stopOpacity={0.8} />
                                <stop offset="100%" stopColor={colors[1]} stopOpacity={0.9} />
                              </linearGradient>
                            ))}
                          </defs>
                          <XAxis 
                            dataKey="name" 
                            stroke="#94A3B8"
                            fontSize={12}
                            axisLine={{ stroke: '#1E293B' }}
                            tickLine={{ stroke: '#1E293B' }}
                          />
                          <YAxis 
                            stroke="#94A3B8"
                            fontSize={12}
                            axisLine={{ stroke: '#1E293B' }}
                            tickLine={{ stroke: '#1E293B' }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(15, 23, 42, 0.95)',
                              border: '1px solid rgba(99, 102, 241, 0.2)',
                              borderRadius: '8px',
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                              backdropFilter: 'blur(8px)',
                              padding: '12px 16px'
                            }}
                            cursor={false}
                            formatter={(value) => [
                              <span key="value" className="text-cyan-400 font-medium">{value} commits</span>,
                              <span key="month" className="text-slate-400 text-sm">
                                {stats.commitsPerMonth[stats.commitsPerMonth.findIndex(m => m.commits === value)]?.name}
                              </span>
                            ]}
                            labelStyle={{ color: '#94A3B8', marginBottom: '4px' }}
                          />
                          <Bar 
                            dataKey="commits"
                            radius={[4, 4, 0, 0]}
                            onMouseEnter={(_, index) => {
                              setActiveBarIndex(index);
                            }}
                            onMouseLeave={() => {
                              setActiveBarIndex(null);
                            }}
                          >
                            {stats.commitsPerMonth.map((_, index) => (
                              <Cell 
                                key={`cell-${index}`}
                                fill={`url(#gradient-bar-${index % GRADIENTS.length})`}
                                stroke={activeBarIndex === index ? GRADIENTS[index % GRADIENTS.length][0] : 'none'}
                                strokeWidth={activeBarIndex === index ? 2 : 0}
                                style={{
                                  filter: activeBarIndex === index 
                                    ? `drop-shadow(0 0 8px ${GRADIENTS[index % GRADIENTS.length][0]}80)`
                                    : 'none',
                                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                  cursor: 'pointer',
                                  opacity: activeBarIndex === null || activeBarIndex === index ? 1 : 0.7
                                }}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-4">
              {commits.length === 0 ? (
                <div className="text-center py-16 bg-black/80 backdrop-blur-xl border border-indigo-500/20 rounded-xl shadow-lg">
                  <h3 className="text-2xl font-medium mb-3 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                    No commits found
                  </h3>
                  <p className="text-slate-400 mb-6">You haven't made any commits yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                  {commits.map((commit, index) => (
                    <Card 
                      key={`${commit.repository.name}-${commit.sha}-${commit.commit.author.date}-${index}`} 
                      className="group border border-indigo-500/20 bg-black/80 backdrop-blur-xl shadow-lg hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 rounded-xl overflow-hidden"
                    >
                      <a
                        href={commit.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block h-full hover:no-underline"
                      >
                        <CardContent className="p-5">
                          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                            <div className="flex-1">
                              <div className="flex flex-wrap items-start gap-2 mb-3">
                                <h3 className="font-medium text-white group-hover:text-cyan-400 transition-all duration-300">
                                  {commit.commit.message}
                                </h3>
                              </div>

                              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                                <div className="flex items-center gap-1">
                                  <Badge variant="outline" className="bg-gradient-to-r from-slate-900/80 to-slate-800/80 backdrop-blur-xl text-slate-300 border-indigo-500/20 group-hover:border-indigo-500/30 transition-colors">
                                    {commit.repository.name}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1">
                                  <GitCommit className="w-4 h-4 text-cyan-400" />
                                  <span>{commit.sha.substring(0, 7)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4 text-blue-400" />
                                  <span>{formatDistanceToNow(new Date(commit.commit.author.date), { addSuffix: true })}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </a>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DashboardLayout>
      </div>
    </>
  )
}