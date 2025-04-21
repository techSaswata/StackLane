"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { useSupabase } from "@/components/supabase-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { v4 as uuidv4 } from "uuid";

type Message = {
  id: string;
  user_id: string;
  user_email: string;
  user_avatar: string;
  content: string;
  created_at: string;
  isDeleting?: boolean;
};

type OnlineUser = {
  id: string;
  email: string;
  avatar_url: string;
  last_seen: string;
};

type Contributor = {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
};

export function ChatPanel({ repoFullName }: { repoFullName: string }) {
  const { supabase, user } = useSupabase();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [showContributorPopup, setShowContributorPopup] = useState(false);
  const [filteredContributors, setFilteredContributors] = useState<Contributor[]>([]);
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null);
  const [loadingPercentage, setLoadingPercentage] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const channel = supabase.channel(`room:${repoFullName}`, {
      config: {
        presence: {
          key: user?.id,
        },
      },
    });

    // Handle presence state changes
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<OnlineUser>();
      const presenceArray = Object.values(state).flat();
      setOnlineUsers(presenceArray);
    });

    // Handle typing indicators
    channel.on("broadcast", { event: "typing" }, ({ payload }) => {
      if (payload.user_id !== user?.id) {
        setIsTyping(true);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
        }, 1000);
      }
    });

    // Subscribe to new messages
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `repo_full_name=eq.${repoFullName}`,
      },
      (payload) => {
        const newMessage = payload.new as Message;
        setMessages((prev) => [...prev, newMessage]);
      }
    );

    // Subscribe to the channel
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        // Track presence after subscription is successful
        channel.track({
          id: user?.id,
          email: user?.email,
          avatar_url: user?.user_metadata?.avatar_url,
          last_seen: new Date().toISOString(),
        });

        // Fetch existing messages
        await fetchMessages();
      }
    });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe(); // Cleanup on unmount
    };
  }, [supabase, repoFullName, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchContributors = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/github/repos/${repoFullName}/contributors`);

        if (!response.ok) {
          throw new Error("Failed to fetch contributors");
        }

        const data = await response.json();

        // Ensure the data structure matches expectations
        const formattedContributors = data.map((contributor: any) => ({
          id: contributor.id,
          name: contributor.login, // Map 'login' to 'name' for consistency
          email: contributor.email || "", // Default to empty string if email is missing
          avatar_url: contributor.avatar_url,
        }));

        setContributors(formattedContributors);
      } catch (err) {
        console.error("Error fetching contributors:", err);
        setContributors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchContributors();
  }, [repoFullName]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        selectedMessage &&
        popupPosition &&
        !target.closest(".popup-container")
      ) {
        setSelectedMessage(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedMessage, popupPosition]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingPercentage(prev => prev < 100 ? prev + 20 : 0);
      }, 200);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("repo_full_name", repoFullName)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTyping = () => {
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: { user_id: user?.id },
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    const atIndex = value.lastIndexOf("@");
    if (atIndex !== -1 && (atIndex === 0 || value[atIndex - 1] === " ")) {
      const query = value.slice(atIndex + 1).toLowerCase();
      const filtered = contributors.filter(
        (contributor) =>
          contributor.name && contributor.name.toLowerCase().includes(query)
      );
      setFilteredContributors(filtered);
      setShowContributorPopup(true);
      setCursorPosition(atIndex);
    } else {
      setShowContributorPopup(false);
    }
  };

  const handleContributorSelect = (contributor: Contributor) => {
    if (cursorPosition !== null) {
      const beforeCursor = newMessage.slice(0, cursorPosition);
      const afterCursor = newMessage.slice(cursorPosition + 1);
      setNewMessage(`${beforeCursor}@${contributor.name} ${afterCursor}`);
      setShowContributorPopup(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const messageId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      const { error } = await supabase.from("messages").insert({
        id: messageId,
        repo_full_name: repoFullName,
        user_id: user.id,
        user_email: user.email,
        user_avatar: user.user_metadata?.avatar_url || "",
        content: newMessage,
        created_at: timestamp,
      });

      if (error) throw error;
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleCopyMessage = (message: Message) => {
    navigator.clipboard.writeText(message.content);
    setSelectedMessage(null); // Close the pop-up
  };

  const handleUnsendMessage = async (message: Message) => {
    try {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === message.id ? { ...msg, isDeleting: true } : msg
        )
      );
      await new Promise((resolve) => setTimeout(resolve, 300)); // Delay for animation
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", message.id);

      if (error) throw error;
      setMessages((prev) => prev.filter((msg) => msg.id !== message.id));
    } catch (error) {
      console.error("Error unsending message:", error);
    } finally {
      setSelectedMessage(null); // Close the pop-up
    }
  };

  const handleEditMessage = (message: Message) => {
    setEditingMessage(message);
    setNewMessage(message.content);
    setSelectedMessage(null); // Close the pop-up
  };

  const handleUpdateMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMessage || !newMessage.trim()) return;

    try {
      const { error } = await supabase
        .from("messages")
        .update({ content: newMessage })
        .eq("id", editingMessage.id);

      if (error) throw error;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === editingMessage.id ? { ...msg, content: newMessage } : msg
        )
      );
      setEditingMessage(null);
      setNewMessage("");
    } catch (error) {
      console.error("Error updating message:", error);
    }
  };

  const handleMessageClick = (e: React.MouseEvent, message: Message) => {
    e.stopPropagation(); // Prevent triggering the outside click handler

    // Set a fixed position for the popup on the left
    setPopupPosition({
      top: 250, // Fixed top position (adjust as needed)
      left: 300, // Fixed left position
    });
    setSelectedMessage(message);
  };

  return (
    <div className="w-full h-[calc(100vh-12rem)] flex pt-4"> {/* Added padding to the top */}
      <Card className="border border-indigo-500/20 bg-black/80 backdrop-blur-xl shadow-xl shadow-indigo-500/10 overflow-hidden rounded-xl h-full flex flex-col w-full">
        <CardContent className="p-6 flex flex-col h-full w-full">
          {/* Online Users */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
            {onlineUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-2 bg-indigo-500/10 px-3 py-1.5 rounded-full"
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.avatar_url || "/placeholder.svg"} />
                  <AvatarFallback>
                    {user.email?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-indigo-400">
                  {user.email?.split("@")[0]}
                </span>
              </div>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-[500px] relative">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-cyan-400"></div>
                <div className="absolute flex items-center justify-center h-16 w-16">
                  <span className="text-cyan-400 font-bold text-lg">{loadingPercentage}%</span>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex justify-center items-center h-full text-white/60">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`relative flex gap-3 ${
                    message.user_id === user?.id ? "justify-end" : "justify-start"
                  } ${message.isDeleting ? "opacity-0 transition-opacity duration-300" : ""}`}
                  onClick={(e) => handleMessageClick(e, message)}
                >
                  {message.user_id !== user?.id && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={message.user_avatar || "/placeholder.svg"}
                      />
                      <AvatarFallback>
                        {message.user_email.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[70%] ${
                      message.user_id === user?.id
                        ? "bg-purple-600 text-white"
                        : "bg-[#1a1a1a] text-white"
                    } rounded-lg p-3 ${(selectedMessage?.id === message.id || editingMessage?.id === message.id) ? "ring-2 ring-white/30" : ""}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-medium text-sm">
                        {message.user_id === user?.id
                          ? "You"
                          : message.user_email.split("@")[0]}
                      </span>
                      <span className="text-xs opacity-70">
                        {formatDistanceToNow(new Date(message.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <p className="mt-1">{message.content}</p>
                  </div>
                  {message.user_id === user?.id && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={message.user_avatar || "/placeholder.svg"}
                      />
                      <AvatarFallback>
                        {message.user_email.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing Indicator */}
          {isTyping && (
            <div className="px-4 py-2 text-sm text-indigo-400">
              Someone is typing...
            </div>
          )}

          {/* Message Options Pop-up */}
          {selectedMessage && popupPosition && (
            <div
              className="absolute z-50 bg-black border border-white/20 rounded-lg p-2 flex flex-col gap-1 popup-container"
              style={{
                top: `${popupPosition.top}px`,
                left: `${popupPosition.left}px`,
                width: "150px"
              }}
            >
              <button
                onClick={() => handleCopyMessage(selectedMessage)}
                className="px-4 py-2 text-left text-sm text-white hover:bg-white/10 rounded-md"
              >
                Copy
              </button>
              {selectedMessage.user_id === user?.id && (
                <>
                  <button
                    onClick={() => handleEditMessage(selectedMessage)}
                    className="px-4 py-2 text-left text-sm text-white hover:bg-white/10 rounded-md"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleUnsendMessage(selectedMessage)}
                    className="px-4 py-2 text-left text-sm text-white hover:bg-white/10 rounded-md"
                  >
                    Unsend
                  </button>
                </>
              )}
              <button
                onClick={() => setSelectedMessage(null)}
                className="px-4 py-2 text-left text-sm text-white hover:bg-white/10 rounded-md"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Message Input */}
          <div className="p-4 border-t border-[#222] relative">
            <form
              onSubmit={editingMessage ? handleUpdateMessage : handleSendMessage}
              className="flex gap-2"
            >
              <Input
                value={newMessage}
                onChange={handleInputChange}
                onKeyPress={handleTyping}
                placeholder={
                  editingMessage ? "Edit your message..." : "Type your message..."
                }
                className="bg-[#0a0a0a] border-[#333] focus-visible:ring-purple-500"
              />
              <Button type="submit" disabled={!newMessage.trim()}>
                {editingMessage ? "Update" : <Send className="h-4 w-4" />}
              </Button>
            </form>
            {showContributorPopup && (
              <div className="absolute bottom-16 left-4 bg-[#1a1a1a] border border-[#333] rounded-lg shadow-lg max-h-40 overflow-y-auto w-64">
                {filteredContributors.length > 0 ? (
                  filteredContributors.map((contributor) => (
                    <div
                      key={contributor.id}
                      onClick={() => handleContributorSelect(contributor)}
                      className="flex items-center gap-2 p-2 hover:bg-[#333] cursor-pointer"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={contributor.avatar_url || "/placeholder.svg"} />
                        <AvatarFallback>
                          {contributor.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-white">{contributor.name}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-2 text-sm text-white/60">No contributors found</div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}