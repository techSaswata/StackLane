"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/components/supabase-provider";
import { ChatPanel } from "@/components/chat-panel";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardLayout from "@/components/dashboard-layout";

type Repo = {
  repo_full_name: string;
  avatar_url: string | null;
};

export default function MessagesPage() {
  const { supabase } = useSupabase();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReposWithChats = async () => {
      try {
        setLoading(true);

        // Call the custom SQL function
        const { data, error } = await supabase.rpc("get_repos_with_chats");

        if (error) throw error;

        // Transform data to unique repos
        const uniqueRepos = data.map((repo: any) => ({
          repo_full_name: repo.repo_full_name,
          avatar_url: repo.user_avatar,
        }));

        setRepos(uniqueRepos);
        if (uniqueRepos.length > 0) {
          setSelectedRepo(uniqueRepos[0]); // Select the first repo by default
        }
      } catch (error) {
        console.error("Error fetching repos with chats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReposWithChats();
  }, [supabase]);

  return (
    <DashboardLayout>
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-1/3 border-r border-[#222] bg-[#111] overflow-y-auto">
          <div className="p-4">
            <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
              Repositories
            </h2>
          </div>
          {loading ? (
            <div className="p-4 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : repos.length === 0 ? (
            <div className="p-4 text-center text-slate-400">
              No ongoing chats available.
            </div>
          ) : (
            <div className="space-y-2">
              {repos.map((repo) => (
                <Card
                  key={repo.repo_full_name}
                  className={`p-4 flex items-center gap-4 cursor-pointer ${
                    selectedRepo?.repo_full_name === repo.repo_full_name
                      ? "border-indigo-500 bg-indigo-500/10"
                      : "border-[#222] hover:border-indigo-500/30"
                  }`}
                  onClick={() => setSelectedRepo(repo)}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={repo.avatar_url || "/placeholder.svg"} />
                    <AvatarFallback>
                      {repo.repo_full_name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-sm font-medium text-white">
                      {repo.repo_full_name}
                    </h3>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Chat Panel */}
        <div className="flex-1 flex flex-col h-full">
          {selectedRepo ? (
            <div className="flex flex-col h-full">
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col-reverse">
                <ChatPanel repoFullName={selectedRepo.repo_full_name} />
              </div>

              {/* Message Input */}
              {/* <div className="border-t border-[#222] bg-[#111] p-4">
                <input
                  type="text"
                  placeholder="Type your message..."
                  className="w-full px-4 py-2 bg-[#222] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div> */}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              Select a repository to view messages.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}