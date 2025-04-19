import { validateEnv, ENV } from "../lib/env"

console.log("Checking environment variables...")

if (validateEnv()) {
  console.log("✅ All required environment variables are set:")
  console.log(`- NEXT_PUBLIC_SUPABASE_URL: ${ENV.SUPABASE_URL.substring(0, 10)}...`)
  console.log(`- NEXT_PUBLIC_APP_URL: ${ENV.APP_URL}`)
  console.log(`- NEXT_PUBLIC_SOCKET_URL: ${ENV.SOCKET_URL}`)
  console.log(`- PORT: ${ENV.PORT}`)
} else {
  console.error("❌ Some required environment variables are missing!")
  process.exit(1)
}
