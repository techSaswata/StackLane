"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation"; // Updated import
import LandingPage from "@/components/landing-page";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function Home() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const interval = setInterval(async () => {
      const { data } = await supabase.auth.getSession();
      const isAuthenticated = !!data.session; // Check if session exists
      if (isAuthenticated) {
        router.push("/dashboard");
      }
    }, 500);

    return () => clearInterval(interval); // Cleanup interval on component unmount
  }, [router, supabase]);

  return <LandingPage />;
}
