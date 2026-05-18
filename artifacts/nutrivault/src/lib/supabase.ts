import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ivpmluwgviyznfupitcn.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2cG1sdXdndml5em5mdXBpdGNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNjM5NzQsImV4cCI6MjA5MzkzOTk3NH0.7kPQxtxPHF-CpRc6RbX7BoUQ4U8DDIO5MsSIE6h5h3g";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const isSupabaseReady = true;
