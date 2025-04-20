"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/components/supabase-provider"
import DashboardLayout from "@/components/dashboard-layout"
import { RepoCard } from "@/components/repo-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { GitPullRequest, GitMerge, Circle, CheckCircle2, Star, GitFork } from "lucide-react"
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, BarChart, Bar } from "recharts"
import { AuthLoading } from "@/components/auth-loading"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { format } from "date-fns"
import { enUS } from "date-fns/locale"

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

const formatDate = (date: string) => {
  const options = { day: 'numeric', month: 'short', year: 'numeric' };
  const suffix = (day: number) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };
  const parsedDate = new Date(date);
  const day = parsedDate.getDate();
  return `${day}${suffix(day)} ${format(parsedDate, 'MMM, yyyy', { locale: enUS })}`;
};

const calculateRating = (stats: GitHubStats | null): string => {
  if (!stats) return "C+";

  const { totalContributions, totalStars, totalCommits, totalPRs, closedIssues } = stats;

  let score = 0;

  // Scoring logic
  if (totalContributions > 1000) score += 3;
  else if (totalContributions > 500) score += 2;
  else if (totalContributions > 100) score += 1;

  if (totalStars > 500) score += 3;
  else if (totalStars > 200) score += 2;
  else if (totalStars > 50) score += 1;

  if (totalCommits > 1000) score += 3;
  else if (totalCommits > 500) score += 2;
  else if (totalCommits > 100) score += 1;

  if (totalPRs > 200) score += 3;
  else if (totalPRs > 100) score += 2;
  else if (totalPRs > 20) score += 1;

  if (closedIssues > 200) score += 3;
  else if (closedIssues > 100) score += 2;
  else if (closedIssues > 20) score += 1;

  // Determine rating based on score
  if (score >= 13) return "A+";
  if (score >= 10) return "A";
  if (score >= 7) return "B+";
  if (score >= 4) return "B";
  return "C+";
};

export default function DashboardMainContent() {
  const supabase = createClientComponentClient()
  const { user, loading: userLoading } = useSupabase()
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [loadingRepos, setLoadingRepos] = useState(true)
  const [loadingLanguages, setLoadingLanguages] = useState(true)
  const [loadingCommits, setLoadingCommits] = useState(true)
  const [loadingIssues, setLoadingIssues] = useState(true)
  const [loadingPRs, setLoadingPRs] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<GitHubStats | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'languages' | 'prStatus'>('languages')
  const router = useRouter()
  const [loadingPercentage, setLoadingPercentage] = useState(0);

  const loadingMessages = [
    "Fetching your Repos, Commits & Pull Requests",
    "Oh! Tooooo many commits 😵‍💫",
    "Hold on a Sec Captain Commit",
  ];
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prevIndex) => (prevIndex + 1) % loadingMessages.length);
    }, 2000); // Change message every 2 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (loadingLanguages || loadingPRs) {
      interval = setInterval(() => {
        setLoadingPercentage((prev) => {
          if (prev < 99) return prev + 1; // Increment until 99%
          return prev; // Stop incrementing at 99%
        });
      }, 100); // Increment every 100ms
    } else {
      setLoadingPercentage(100); // Set to 100% when loading is complete
      if (interval) clearInterval(interval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loadingLanguages, loadingPRs]);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login")
    }
  }, [user, userLoading, router, supabase]);

  useEffect(() => {
    if (
      !userLoading &&
      !loadingRepos &&
      !loadingCommits &&
      !loadingIssues &&
      !loadingPRs &&
      stats !== null
    ) {
      setInitialLoading(false);
    }
  }, [
    userLoading,
    loadingRepos,
    loadingCommits,
    loadingIssues,
    loadingPRs,
    stats,
  ]);

  useEffect(() => {
    if (repositories.length > 0 && stats !== null) {
      console.log("Repositories and stats are ready. Showing dashboard.");
      setInitialLoading(false);
    }
  }, [repositories, stats]);

  useEffect(() => {
    const fetchRepositories = async () => {
      if (!user) return;

      try {
        setLoadingRepos(true);
        const response = await fetch("/api/github/repos");

        if (!response.ok) {
          const errorDetails = await response.json();
          console.error("Error fetching repositories:", {
            status: response.status,
            statusText: response.statusText,
            errorDetails,
          });
          throw new Error("Failed to fetch repositories");
        }

        const data = await response.json();
        console.log("Fetched repositories:", data); // Log the fetched repositories

        // Incrementally add repositories to the state
        for (const repo of data) {
          setRepositories((prev) => [...prev, repo]);
        }
      } catch (err) {
        console.error("An error occurred while fetching repositories:", err);
        setError("Failed to load your repositories. Please try again later.");
      } finally {
        setLoadingRepos(false);
      }
    };


    if (user) {
      fetchRepositories();
    }
  }, [user]);

  useEffect(() => {
    const fetchGitHubStats = async () => {
      if (!user) return;

      try {
        setLoadingPRs(true);
        setLoadingCommits(true);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !session.provider_token) {
          setError("GitHub access token not found. Please sign in again.");
          router.push("/login");
          return;
        }

        const [reposResponse, prsResponse] = await Promise.all([
          fetch("https://api.github.com/user/repos", {
            headers: {
              Authorization: `Bearer ${session.provider_token}`,
              Accept: "application/vnd.github.v3+json",
            },
          }),
          fetch(
            `https://api.github.com/search/issues?q=author:${user?.user_metadata?.user_name}+type:pr&per_page=100`,
            {
              headers: {
                Authorization: `Bearer ${session.provider_token}`,
                Accept: "application/vnd.github.v3+json",
              },
            }
          ),
        ]);

        if (!reposResponse.ok || !prsResponse.ok) {
          throw new Error("Failed to fetch data from GitHub API");
        }

        const [repos, prsData] = await Promise.all([
          reposResponse.json(),
          prsResponse.json(),
        ]);

        interface Commit {
          commit: {
            author: {
              date: string;
            };
          };
        }
        const allCommits: Commit[] = [];
        const commitsPerMonth: { [key: string]: number } = {};
        let streak = 0;

        await Promise.all(
          repos.map(async (repo: Repository) => {
            const commitsResponse: Response = await fetch(
              `https://api.github.com/repos/${repo.full_name}/commits?author=${user?.user_metadata?.user_name || ''}`,
              {
          headers: {
            Authorization: `Bearer ${session.provider_token}`,
            Accept: "application/vnd.github.v3+json",
          },
              }
            );

            if (commitsResponse.ok) {
              const repoCommits: Commit[] = await commitsResponse.json();
              allCommits.push(...repoCommits);

              repoCommits.forEach((commit: Commit) => {
          const monthYear: string = format(new Date(commit.commit.author.date), 'MMM yyyy');
          commitsPerMonth[monthYear] = (commitsPerMonth[monthYear] || 0) + 1;
              });
            }
          })
        );

        const sortedDates = allCommits
          .map((c) => new Date(c.commit.author.date))
          .sort((a, b) => b.getTime() - a.getTime());

        if (sortedDates.length > 0) {
          const today = new Date();
          let currentDate = new Date(sortedDates[0]);

          while (
            currentDate.toDateString() === today.toDateString() ||
            (today.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24) <= streak
          ) {
            if (sortedDates.some((d) => d.toDateString() === currentDate.toDateString())) {
              streak++;
            }
            currentDate.setDate(currentDate.getDate() - 1);
          }
        }

        interface PullRequest {
          id: number;
          merged: boolean;
        }

        const prs: PullRequest[] = prsData.items.map((item: { id: number; pull_request?: { merged_at?: string | null } }) => ({
          id: item.id,
          merged: !!item.pull_request?.merged_at,
        }));

        const totalPRs = prs.length;
        const mergedPRs = prs.filter((pr) => pr.merged).length;
        const openPRs = totalPRs - mergedPRs;

        const commitsPerMonthData = Object.entries(commitsPerMonth)
          .map(([name, commits]) => ({ name, commits }))
          .sort((a, b) => new Date(b.name).getTime() - new Date(a.name).getTime())
          .slice(0, 12)
          .reverse();

        console.log("Fetched repositories:", repos);
        console.log("Total Commits:", allCommits.length);
        console.log("Commits Per Month:", commitsPerMonthData);
        console.log("Merged PRs:", mergedPRs);
        console.log("Total PRs:", totalPRs);

        setStats((prev) => ({
          totalCommits: allCommits.length,
          currentStreak: streak,
          totalPRs,
          mergedPRs,
          prStats: {
            merged: mergedPRs,
            open: openPRs,
          },
          contributionData: {
            dates: commitsPerMonthData.map((entry) => entry.name),
            counts: commitsPerMonthData.map((entry) => entry.commits),
          },
          languages: prev?.languages || {},
          closedIssues: prev?.closedIssues || 0,
          totalStars: prev?.totalStars || 0,
          contributedRepos: prev?.contributedRepos || 0,
          totalContributions: prev?.totalContributions || 0,
          currentStreakDate: prev?.currentStreakDate || "",
          contributionStartDate: prev?.contributionStartDate || "",
          longestStreak: prev?.longestStreak || 0,
          longestStreakRange: prev?.longestStreakRange || "",
          ongoingPRs: prev?.ongoingPRs || 0,
        }));
      } catch (error) {
        console.error("Error fetching GitHub stats:", error);
        setError("Failed to load your GitHub statistics. Please try again later.");
      } finally {
        setLoadingPRs(false);
        setLoadingCommits(false);
      }
    };

    fetchGitHubStats();
  }, [user]);

  useEffect(() => {
    const fetchLanguages = async () => {
      if (!user || !repositories.length) return;

      try {
        setLoadingLanguages(true);
        const languages: { [key: string]: number } = {};

        for (const repo of repositories) {
          const response = await fetch(`/api/github/repos/${repo.full_name}/languages`);
          if (!response.ok) continue;

          const data = await response.json();
          for (const [lang, value] of Object.entries(data)) {
            if (typeof value === "number") {
              languages[lang] = (languages[lang] || 0) + value;
            }
          }
        }

        setStats((prev) => ({
          ...prev,
          languages,
          totalCommits: prev?.totalCommits || 0,
          closedIssues: prev?.closedIssues || 0,
          totalPRs: prev?.totalPRs || 0,
          mergedPRs: prev?.mergedPRs || 0,
          ongoingPRs: prev?.ongoingPRs || 0,
          prStats: prev?.prStats || { merged: 0, open: 0 },
          contributionData: prev?.contributionData || { dates: [], counts: [] },
          totalStars: prev?.totalStars || 0,
          contributedRepos: prev?.contributedRepos || 0,
          totalContributions: prev?.totalContributions || 0,
          currentStreak: prev?.currentStreak || 0,
          currentStreakDate: prev?.currentStreakDate || "",
          contributionStartDate: prev?.contributionStartDate || "",
          longestStreak: prev?.longestStreak || 0,
          longestStreakRange: prev?.longestStreakRange || "",
        }));
      } catch (error) {
        console.error("Error fetching languages:", error);
        setError("Failed to load language statistics. Please try again later.");
      } finally {
        setLoadingLanguages(false);
      }
    };

 
      fetchLanguages();
    
  }, [user, repositories]);

  useEffect(() => {
    const fetchContributionStats = async () => {
      if (!user) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !session.provider_token) {
          setError("GitHub access token not found. Please sign in again.");
          router.push("/login");
          return;
        }

        const query = `
          query ContributionsView($username: String!, $from: DateTime!, $to: DateTime!) {
            user(login: $username) {
              contributionsCollection(from: $from, to: $to) {
                totalCommitContributions
                totalIssueContributions
                totalPullRequestContributions
                totalPullRequestReviewContributions
                contributionCalendar {
                  weeks {
                    contributionDays {
                      contributionCount
                      date
                    }
                  }
                }
              }
            }
          }
        `;

        const today = new Date();
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(today.getFullYear() - 1);

        const variables = {
          username: user?.user_metadata?.user_name,
          from: oneYearAgo.toISOString(),
          to: today.toISOString(),
        };

        const response = await fetch("https://api.github.com/graphql", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.provider_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query, variables }),
        });

        if (!response.ok) {
          const errorDetails = await response.json();
          console.error("Error fetching contributions data:", {
            status: response.status,
            statusText: response.statusText,
            errorDetails,
          });
          throw new Error("Failed to fetch contributions data from GitHub GraphQL API.");
        }

        const { data } = await response.json();
        const contributions = data.user.contributionsCollection;

        // Calculate total contributions
        const totalContributions =
          contributions.totalCommitContributions +
          contributions.totalIssueContributions +
          contributions.totalPullRequestContributions +
          contributions.totalPullRequestReviewContributions;

        // Calculate longest streak
        interface ContributionDay {
          contributionCount: number;
          date: string;
        }

        interface Week {
          contributionDays: ContributionDay[];
        }

        interface ContributionCalendar {
          weeks: Week[];
        }

        interface ContributionsCollection {
          totalCommitContributions: number;
          totalIssueContributions: number;
          totalPullRequestContributions: number;
          totalPullRequestReviewContributions: number;
          contributionCalendar: ContributionCalendar;
        }

        const contributionDays: ContributionDay[] = contributions.contributionCalendar.weeks.flatMap(
          (week: Week) => week.contributionDays
        );

        let currentStreak = 0;
        let longestStreak = 0;
        let streakStartDate = "";
        let streakEndDate = "";
        let tempStreakStartDate = "";

        for (let i = 0; i < contributionDays.length; i++) {
          if (contributionDays[i].contributionCount > 0) {
            currentStreak++;
            if (currentStreak === 1) {
              tempStreakStartDate = contributionDays[i].date;
            }
            if (currentStreak > longestStreak) {
              longestStreak = currentStreak;
              streakStartDate = tempStreakStartDate;
              streakEndDate = contributionDays[i].date;
            }
          } else {
            currentStreak = 0;
          }
        }

        // Format streak dates
        const formattedStreakStartDate = streakStartDate
          ? formatDate(streakStartDate)
          : "";
        const formattedStreakEndDate = streakEndDate
          ? formatDate(streakEndDate)
          : "";

        setStats((prev) => ({
          ...prev,
          totalContributions,
          longestStreak,
          longestStreakRange: `${formattedStreakStartDate} - ${formattedStreakEndDate}`,
          totalCommits: prev?.totalCommits || 0,
          closedIssues: prev?.closedIssues || 0,
          totalPRs: prev?.totalPRs || 0,
          mergedPRs: prev?.mergedPRs || 0,
          ongoingPRs: prev?.ongoingPRs || 0,
          prStats: prev?.prStats || { merged: 0, open: 0 },
          contributionData: prev?.contributionData || { dates: [], counts: [] },
          languages: prev?.languages || {},
          totalStars: prev?.totalStars || 0,
          contributedRepos: prev?.contributedRepos || 0,
          currentStreak: prev?.currentStreak || 0,
          currentStreakDate: prev?.currentStreakDate || "",
          contributionStartDate: prev?.contributionStartDate || "",
        }));
      } catch (error) {
        if (error instanceof Error) {
          console.error("Error fetching contribution stats:", error.message);
        } else {
          console.error("Error fetching contribution stats:", error);
        }
        setError("Failed to load your GitHub statistics. Please check your GitHub API token or try again later.");
      }
    };

    fetchContributionStats();
  }, [user]);

  useEffect(() => {
    const fetchTotalStars = async () => {
      if (!user) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !session.provider_token) {
          setError("GitHub access token not found. Please sign in again.");
          router.push("/login");
          return;
        }

        let totalStars = 0;
        let page = 1;
        const perPage = 100;

        while (true) {
          const response = await fetch(
            `https://api.github.com/user/starred?per_page=${perPage}&page=${page}`,
            {
              headers: {
                Authorization: `Bearer ${session.provider_token}`,
                Accept: "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
              },
            }
          );

          if (!response.ok) {
            const errorDetails = await response.json();
            console.error("Error fetching starred repositories:", {
              status: response.status,
              statusText: response.statusText,
              errorDetails,
            });
            throw new Error("Failed to fetch starred repositories.");
          }

          const starredRepos = await response.json();
          totalStars += starredRepos.length;

          if (starredRepos.length < perPage) break; // Exit loop if no more pages
          page++;
        }

        setStats((prev) => ({
          ...prev,
          totalStars,
          totalCommits: prev?.totalCommits || 0,
          closedIssues: prev?.closedIssues || 0,
          totalPRs: prev?.totalPRs || 0,
          mergedPRs: prev?.mergedPRs || 0,
          ongoingPRs: prev?.ongoingPRs || 0,
          prStats: prev?.prStats || { merged: 0, open: 0 },
          contributionData: prev?.contributionData || { dates: [], counts: [] },
          languages: prev?.languages || {},
          totalContributions: prev?.totalContributions || 0,
          contributedRepos: prev?.contributedRepos || 0,
          currentStreak: prev?.currentStreak || 0,
          currentStreakDate: prev?.currentStreakDate || "",
          contributionStartDate: prev?.contributionStartDate || "",
          longestStreak: prev?.longestStreak || 0,
          longestStreakRange: prev?.longestStreakRange || "",
        }));
      } catch (error) {
        console.error("Error fetching total stars:", error);
        setError("Failed to load your starred repositories. Please try again later.");
      }
    };

    fetchTotalStars();
  }, [user]);

  useEffect(() => {
    const fetchTotalClosedIssues = async () => {
      if (!user) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !session.provider_token) {
          setError("GitHub access token not found. Please sign in again.");
          router.push("/login");
          return;
        }

        const response = await fetch(
          `https://api.github.com/search/issues?q=author:${user?.user_metadata?.user_name}+type:issue+state:closed&per_page=1`,
          {
            headers: {
              Authorization: `Bearer ${session.provider_token}`,
              Accept: "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
            },
          }
        );

        if (!response.ok) {
          const errorDetails = await response.json();
          console.error("Error fetching closed issues:", {
            status: response.status,
            statusText: response.statusText,
            errorDetails,
          });
          throw new Error("Failed to fetch closed issues.");
        }

        const data = await response.json();
        const totalClosedIssues = data.total_count;

        setStats((prev) => ({
          ...prev,
          closedIssues: totalClosedIssues,
          totalCommits: prev?.totalCommits || 0,
          totalPRs: prev?.totalPRs || 0,
          mergedPRs: prev?.mergedPRs || 0,
          ongoingPRs: prev?.ongoingPRs || 0,
          prStats: prev?.prStats || { merged: 0, open: 0 },
          contributionData: prev?.contributionData || { dates: [], counts: [] },
          languages: prev?.languages || {},
          totalStars: prev?.totalStars || 0,
          contributedRepos: prev?.contributedRepos || 0,
          totalContributions: prev?.totalContributions || 0,
          currentStreak: prev?.currentStreak || 0,
          currentStreakDate: prev?.currentStreakDate || "",
          contributionStartDate: prev?.contributionStartDate || "",
          longestStreak: prev?.longestStreak || 0,
          longestStreakRange: prev?.longestStreakRange || "",
        }));
      } catch (error) {
        console.error("Error fetching total closed issues:", error);
        setError("Failed to load your closed issues. Please try again later.");
      }
    };

    fetchTotalClosedIssues();
  }, [user]);

  useEffect(() => {
    const fetchContributedRepos = async () => {
      if (!user || repositories.length === 0) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !session.provider_token) {
          setError("GitHub access token not found. Please sign in again.");
          router.push("/login");
          return;
        }

        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        let contributedReposCount = 0;

        await Promise.all(
          repositories.map(async (repo) => {
            const response = await fetch(
              `https://api.github.com/repos/${repo.full_name}/pulls?state=all&author=${user?.user_metadata?.user_name}&since=${oneYearAgo.toISOString()}`,
              {
                headers: {
                  Authorization: `Bearer ${session.provider_token}`,
                  Accept: "application/vnd.github+json",
                },
              }
            );

            if (!response.ok) {
              console.error(`Error fetching pull requests for repo ${repo.full_name}:`, {
                status: response.status,
                statusText: response.statusText,
              });
              return;
            }

            const pullRequests = await response.json();
            if (pullRequests.length > 0) {
              contributedReposCount++;
            }
          })
        );

        setStats((prev) => ({
          ...prev,
          contributedRepos: contributedReposCount,
          totalCommits: prev?.totalCommits || 0,
          closedIssues: prev?.closedIssues || 0,
          totalPRs: prev?.totalPRs || 0,
          mergedPRs: prev?.mergedPRs || 0,
          ongoingPRs: prev?.ongoingPRs || 0,
          prStats: prev?.prStats || { merged: 0, open: 0 },
          contributionData: prev?.contributionData || { dates: [], counts: [] },
          languages: prev?.languages || {},
          totalStars: prev?.totalStars || 0,
          totalContributions: prev?.totalContributions || 0,
          currentStreak: prev?.currentStreak || 0,
          currentStreakDate: prev?.currentStreakDate || "",
          contributionStartDate: prev?.contributionStartDate || "",
          longestStreak: prev?.longestStreak || 0,
          longestStreakRange: prev?.longestStreakRange || "",
        }));
      } catch (error) {
        console.error("Error fetching contributed repositories:", error);
        setError("Failed to load contributed repositories. Please try again later.");
      }
    };

    fetchContributedRepos();
  }, [user, repositories]);

  if (loadingRepos && repositories.length === 0) {
    return (
      <div className="w-full h-screen">
        <AuthLoading message="Loading your repositories..." />
      </div>
    );
  }

  if (initialLoading) {
    return (
      <div className="w-full h-screen">
        <AuthLoading message={loadingMessages[currentMessageIndex]} />
      </div>
    );
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
    );
  }

  if (!stats) {
    return (
      <DashboardLayout>
        <div className="p-6 w-full">
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (repositories.length === 0) {
    return (
      <DashboardLayout>
        <div className="p-6 w-full">
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
        </div>
      </DashboardLayout>
    );
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
                  data={stats?.contributionData?.dates.map((date, index) => ({
                    date,
                    contributions: stats.contributionData?.counts[index] || 0,
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
        <div className="grid grid-cols-1 gap-6">
          {/* Tabs */}
          <div className="flex gap-3">
            <button
              onClick={() => setActiveTab('languages')}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                activeTab === 'languages'
                  ? 'bg-gradient-to-r from-slate-900/80 to-slate-800/80 text-blue-400 shadow-lg shadow-black/20 border border-slate-700/50'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Most Used Languages
            </button>
            <button
              onClick={() => setActiveTab('prStatus')}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                activeTab === 'prStatus'
                  ? 'bg-gradient-to-r from-slate-900/80 to-slate-800/80 text-blue-400 shadow-lg shadow-black/20 border border-slate-700/50'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              PR Status
            </button>
          </div>

          {activeTab === 'languages' ? (
            <Card className="border border-indigo-500/20 bg-black/80 backdrop-blur-xl shadow-xl shadow-indigo-500/10">
              <CardHeader>
                <CardTitle className="text-lg text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                  Languages Used
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingLanguages ? (
                  <div className="flex items-center justify-center h-[500px] relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-cyan-400"></div>
                    <div className="absolute flex items-center justify-center h-16 w-16">
                      <span className="text-cyan-400 font-bold text-lg">{loadingPercentage}%</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-8 h-[500px]">
                    <div className="h-full w-[500px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={Object.entries(stats?.languages || {}).map(([name, value]) => ({
                              name,
                              value,
                            }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={160}
                            paddingAngle={3}
                            dataKey="value"
                            nameKey="name"
                          >
                            {Object.entries(stats?.languages || {}).map(([name], index) => (
                              <Cell
                                key={`cell-lang-${index}`}
                                fill={`hsl(${(index * 360) / Object.keys(stats?.languages || {}).length}, 70%, 50%)`}
                                stroke="#222"
                                strokeWidth={1}
                              />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-3 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                      {Object.entries(stats?.languages || {}).map(([name, value], index) => (
                        <div
                          key={name}
                          className="flex items-center gap-3 p-3 rounded-lg transition-all duration-300 hover:bg-slate-800/30"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                background: `hsl(${(index * 360) / Object.keys(stats?.languages || {}).length}, 70%, 50%)`,
                              }}
                            />
                            <span className="font-medium text-slate-200">{name}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-slate-400">{value} bytes</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-indigo-500/20 bg-black/80 backdrop-blur-xl shadow-xl shadow-indigo-500/10">
              <CardHeader>
                <CardTitle className="text-lg text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                  Pull Request Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingPRs ? (
                  <div className="flex items-center justify-center h-[500px] relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-400"></div>
                    <div className="absolute flex items-center justify-center h-16 w-16">
                      <span className="text-blue-400 font-bold text-lg">{loadingPercentage}%</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-8 h-[500px]">
                    <div className="h-full w-[500px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <defs>
                            <linearGradient id="gradient-merged" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#9333EA" stopOpacity={0.95} />
                              <stop offset="100%" stopColor="#7E22CE" stopOpacity={0.9} />
                            </linearGradient>
                            <linearGradient id="gradient-open" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.95} />
                              <stop offset="100%" stopColor="#2563EB" stopOpacity={0.9} />
                            </linearGradient>
                          </defs>
                          <Pie
                            data={[
                              { name: 'Merged', value: stats?.prStats.merged || 0 },
                              { name: 'Open', value: (stats?.totalPRs || 0) - (stats?.prStats.merged || 0) },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={160}
                            paddingAngle={3}
                            dataKey="value"
                            nameKey="name"
                          >
                            <Cell fill="url(#gradient-merged)" stroke="#222" strokeWidth={1} />
                            <Cell fill="url(#gradient-open)" stroke="#222" strokeWidth={1} />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-3 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                      {[
                        { name: 'Merged', value: stats?.prStats.merged || 0 },
                        { name: 'Open', value: (stats?.totalPRs || 0) - (stats?.prStats.merged || 0) },
                      ].map((entry, index) => (
                        <div
                          key={entry.name}
                          className="flex items-center gap-3 p-3 rounded-lg transition-all duration-300 hover:bg-slate-800/30"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                background: index === 0
                                  ? `linear-gradient(to bottom right, #9333EA, #7E22CE)`
                                  : `linear-gradient(to bottom right, #3B82F6, #2563EB)`,
                              }}
                            />
                            <span className="font-medium text-slate-200">{entry.name}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-slate-400">{entry.value} PRs</span>
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-400 w-[60px] text-right">
                              {((entry.value / (stats?.totalPRs || 1)) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
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
                  <span className="text-lg text-blue-300">Total Commits (Last Year):</span>
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
                    <span className="text-6xl font-bold text-cyan-300">{calculateRating(stats)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contribution Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-[#111] border-[#222] h-[250px]">
            <CardContent className="h-full flex flex-col items-center justify-center text-center">
              <h3 className="text-5xl font-bold text-purple-500 mb-2">{stats?.totalContributions}</h3>
              <p className="text-lg text-blue-300">Total Contributions</p>
              <p className="text-xs text-gray-500 mt-1 italic">
                (Public Repositories)
              </p>
              <p className="text-sm text-gray-400 mt-3">
                {stats?.contributionStartDate} - Present
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-[#111] border-[#222] h-[250px]">
            <CardContent className="h-full flex flex-col items-center justify-center text-center">
              <div className="h-20 w-20 rounded-full border-4 border-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 flex items-center justify-center mb-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                <span className="text-4xl font-bold text-amber-400">{stats?.currentStreak}</span>
              </div>
              <p className="text-lg text-teal-300">Current Streak</p>
              <p className="text-sm text-gray-400 mt-2">{stats?.currentStreakDate}</p>
              <p className="text-sm text-gray-500 mt-1">{formatDate(new Date().toISOString())}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-[#111] border-[#222] h-[250px]">
            <CardContent className="h-full flex flex-col items-center justify-center text-center">
              <h3 className="text-5xl font-bold text-cyan-500 mb-4">{stats?.longestStreak}</h3>
              <p className="text-lg text-indigo-300">Longest Streak</p>
              <p className="text-sm text-gray-400 mt-2">{stats?.longestStreakRange}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}