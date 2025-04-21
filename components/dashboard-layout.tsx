"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSupabase } from "@/components/supabase-provider"
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LayoutDashboard, GitBranch, MessageSquare, Settings, LogOut, Github, Search, Bell, GitCommit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user, supabase } = useSupabase()
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState("")
  const { state } = useSidebar()
  
  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Rooms", href: "/repositories", icon: Github },
    { name: "Pull Requests", href: "/pull-requests", icon: GitBranch },
    { name: "Commits", href: "/commits", icon: GitCommit },
    // { name: "Messages", href: "/messages", icon: MessageSquare },
    // { name: "Settings", href: "/settings", icon: Settings },
  ]

  const userInitials = user?.email ? user.email.substring(0, 2).toUpperCase() : "U"

  return (
    <>
      <Sidebar variant="sidebar" collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-500 rounded-md flex items-center justify-center">
              <Github className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold">StackLane</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.name}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="mb-10">
          <div className="flex flex-col items-center gap-2 px-4 py-3 text-center">
            <SidebarMenuButton className="flex items-center gap-2 justify-center w-full">
              <Avatar className="w-6 h-6">
                <AvatarImage src={user?.user_metadata?.avatar_url || "/placeholder.svg"} />
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <span>{user?.user_metadata?.name || user?.email}</span>
            </SidebarMenuButton>
            <span className="text-sm text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-green-400">
              Made with <span className="text-red-500">❤️</span> by Techy
            </span>
          </div>
        </SidebarFooter>
      </Sidebar>

      <div className="flex-1 flex flex-col min-h-0 w-full">
        <header className="flex-shrink-0 h-16 border-b border-[#222] bg-[#111] flex items-center justify-between px-4 w-full">
          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Input
                type="text"
                placeholder="Search..."
                className="bg-[#0a0a0a] border-[#333] focus-visible:ring-purple-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full"></span>
            </Button> */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.user_metadata?.avatar_url || "/placeholder.svg"} alt="User" />
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 min-h-0 overflow-auto bg-[#0a0a0a] w-full">{children}</main>
      </div>
    </>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-[#0a0a0a]">
        <DashboardContent>{children}</DashboardContent>
      </div>
    </SidebarProvider>
  )
}
