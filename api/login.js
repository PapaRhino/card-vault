// api/login.js
//
// Checks a username + PIN against the `pins` table using the service role
// key (server-side only — this key never reaches the browser). Returns the
// matching profile (no pin) on success.

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { username, pin } = req.body || {}

  if (!username || !pin) {
    return res.status(400).json({ error: 'Missing username or pin' })
  }

  // Look up the profile by username
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, username, display_name, avatar, role')
    .eq('username', username.toLowerCase().trim())
    .single()

  if (profileError || !profile) {
    return res.status(401).json({ error: 'Invalid username or PIN' })
  }

  // Check the PIN
  const { data: pinRow, error: pinError } = await supabaseAdmin
    .from('pins')
    .select('pin')
    .eq('profile_id', profile.id)
    .single()

  if (pinError || !pinRow || pinRow.pin !== pin) {
    return res.status(401).json({ error: 'Invalid username or PIN' })
  }

  // Success — return the profile, never the pin
  return res.status(200).json({ profile })
}
