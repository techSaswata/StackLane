import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { GitFork, Star, AlertCircle, Clock, MessageSquare, Users } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useSupabase } from "@/components/supabase-provider"
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

export function RepoCard({ repository }: { repository: Repository }) {
  const { supabase } = useSupabase()
  const router = useRouter()
  const [messageCount, setMessageCount] = useState(0)
  const [contributorCount, setContributorCount] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Fetch message count from Supabase
    const fetchMessageCount = async () => {
      const { count, error } = await supabase
        .from("messages")
        .select("*", { count: "exact" })
        .eq("repo_full_name", repository.full_name)

      if (!error && count !== null) {
        setMessageCount(count)
      }
    }

    // Fetch contributor count from GitHub API
    const fetchContributorCount = async () => {
      try {
        const response = await fetch(`/api/github/repos/${repository.full_name}/contributors`)
        if (response.ok) {
          const contributors = await response.json()
          setContributorCount(contributors.length)
        }
      } catch (error) {
        console.error("Error fetching contributors:", error)
      }
    }

    fetchMessageCount()
    fetchContributorCount()
  }, [repository.full_name, supabase])

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    setLoading(true)
    router.push(`/room/${repository.full_name}`)
  }

  if (loading) {
    return <AuthLoading message="Customising your Room" />
  }

  return (
    <Link href={`/room/${repository.full_name}`} onClick={handleClick} className="block hover:no-underline">
      <Card className="border-[#222] bg-[#111] hover:border-purple-500/50 transition-colors overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            <span className="hover:text-purple-400 transition-colors cursor-pointer">
              {repository.name}
            </span>
          </CardTitle>
          <CardDescription className="line-clamp-2 h-10">
            {repository.description || "No room description provided"}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="flex items-center gap-4 text-sm text-white/60">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>Members: {contributorCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              <span>Discussions: {messageCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              <span>Issues: {repository.open_issues_count}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="text-xs text-white/50 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>Active {formatDistanceToNow(new Date(repository.updated_at))} ago</span>
        </CardFooter>
      </Card>
    </Link>
  )
}
