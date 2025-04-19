"use client";

import { useState } from "react";
import { Github } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { AuthLoading } from "@/components/auth-loading";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [authInProgress, setAuthInProgress] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleGitHubLogin = async () => {
    console.log("GitHub login function called");
    try {
      setLoading(true);
      console.log("Setting loading to true");
      await new Promise((resolve) => setTimeout(resolve, 100));
      console.log("Starting OAuth flow with Supabase");

      // Start the full-page loading animation
      setAuthInProgress(true);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      console.log("OAuth response:", { data, error });
      if (error) throw error;

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Error during login:", error);
      // If there's an error, stop the loading animation
      setAuthInProgress(false);
      setLoading(false);
    }
  };

  return (
    <>
      {authInProgress && <AuthLoading />}
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4 relative">
        {/* Background gradient (non-interactive) */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-purple-900/10 via-transparent to-transparent opacity-80 pointer-events-none" />
        </div>

        {/* Card with raised z-index to be above background */}
        <Card className="w-full max-w-md border-[#222] bg-[#111] relative z-10">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-500 rounded-xl flex items-center justify-center">
                <Github className="w-6 h-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center">Sign in to StackLane</CardTitle>
            <CardDescription className="text-center text-white/60">
              Connect with GitHub to manage your repositories
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <button
              type="button"
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-md hover:opacity-90 transition-all flex items-center justify-center gap-2 font-semibold relative cursor-pointer"
              onClick={() => {
                console.log("Button clicked via onClick prop");
                handleGitHubLogin();
              }}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  Connecting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Github className="w-4 h-4" />
                  Sign in with GitHub
                </span>
              )}
            </button>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-white/60 text-center">
              By signing in, you agree to our{" "}
              <Link href="/terms" className="text-purple-400 hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-purple-400 hover:underline">
                Privacy Policy
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
