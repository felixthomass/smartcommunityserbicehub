import { createClient } from '@supabase/supabase-js'

// Direct Supabase configuration
const supabaseUrl = 'https://fgzsrgoxgoserdmbctvl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnenNyZ294Z29zZXJkbWJjdHZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyODI3NDEsImV4cCI6MjA2OTg1ODc0MX0.PlAisOeMbUr4x9xVkUUMbJBqO-53rFMv51GxTiq8QE0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test connection
console.log('Supabase client initialized:', supabase)