import { createClient } from "@supabase/supabase-js"
import { ENV } from "../lib/env"

async function setupSupabase() {
  console.log("Setting up Supabase database schema...")

  const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY)

  try {
    // Create messages table
    console.log("Creating messages table...")
    const { error: messagesError } = await supabase.rpc("create_messages_table", {})

    if (messagesError) {
      if (messagesError.message.includes("already exists")) {
        console.log("✅ Messages table already exists")
      } else {
        throw messagesError
      }
    } else {
      console.log("✅ Messages table created successfully")
    }

    console.log("✅ Supabase setup completed successfully!")
  } catch (error) {
    console.error("❌ Error setting up Supabase:", error)
    process.exit(1)
  }
}

// Create the stored procedure for creating the messages table
async function createStoredProcedure() {
  const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY)

  const { error } = await supabase.rpc("create_stored_procedure", {})

  if (error) {
    if (error.message.includes("already exists")) {
      console.log("✅ Stored procedure already exists")
    } else {
      console.error("❌ Error creating stored procedure:", error)
    }
  } else {
    console.log("✅ Stored procedure created successfully")
  }
}

// Run the setup
setupSupabase()
