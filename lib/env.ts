// Environment variables utility

export const ENV = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  APP_URL: process.env.NEXT_PUBLIC_APP_URL as string,
  SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL as string,
  PORT: process.env.PORT || "3001",
}

// Validate required environment variables
export function validateEnv() {
  const requiredVars = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "APP_URL", "SOCKET_URL"]
  const missing = requiredVars.filter((key) => !ENV[key as keyof typeof ENV])

  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(", ")}`)
    return false
  }

  return true
}
