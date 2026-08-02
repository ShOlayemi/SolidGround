'use server'

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function joinWaitlist(email: string) {
  // Server-side validation
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Please enter a valid email address.' }
  }

  const { error } = await supabase
    .from('waitlist')
    .insert({ email })

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: "You're already on the list!" }
    }
    console.error('Waitlist insert error:', error)
    return { success: false, error: 'Something went wrong. Please try again.' }
  }

  return { success: true }
}
