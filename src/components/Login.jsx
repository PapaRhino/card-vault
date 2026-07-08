import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

// Internal-only email domain — never shown to users, just how Supabase Auth
// identifies accounts under the hood. Profiles are matched to auth accounts
// by a `username` you choose when creating each account (see setup notes).
const EMAIL_DOMAIN = 'family.card-vault.internal'

export default function Login({ onLogin }) {
  const [profiles, setProfiles] = useState([])
  const [loadingProfiles, setLoadingProfiles] = useState(true)
  const [selected, setSelected] = useState(null)  // the chosen profile
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadProfiles()
  }, [])

  async function loadProfiles() {
    setLoadingProfiles(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar, username')
      .order('display_name')

    if (!error) setProfiles(data ?? [])
    setLoadingProfiles(false)
  }

  function pickProfile(profile) {
    setSelected(profile)
    setPin('')
    setError('')
  }

  async function submitPin(pinValue) {
    if (!selected || submitting) return
    setSubmitting(true)
    setError('')

    const email = `${selected.username}@${EMAIL_DOMAIN}`

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: pinValue,
    })

    setSubmitting(false)

    if (authError) {
      setError('Wrong PIN, try again')
      setPin('')
      return
    }

    onLogin()
  }

  const PIN_LENGTH = 6

  function handleKeyPress(digit) {
    if (submitting) return
    const next = pin + digit
    setPin(next)
    setError('')
    if (next.length === PIN_LENGTH) {
      submitPin(next)
    }
  }

  function handleBackspace() {
    setPin(p => p.slice(0, -1))
  }

  function handleSubmit() {
    submitPin(pin)
  }

  const wrapperStyle = {
    minHeight: '100dvh', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg)',
  }

  const cardStyle = {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 16, padding: '2.5rem 2rem', width: '100%',
    maxWidth: 360, textAlign: 'center',
  }

  // ── Screen 1: pick a profile ──
  if (!selected) {
    return (
      <div style={wrapperStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🃏</div>
          <h1 style={{ fontFamily: 'var(--mono)', fontSize: '1.25rem', color: 'var(--accent)', marginBottom: 20 }}>
            Who's this?
          </h1>

          {loadingProfiles && <p style={{ color: 'var(--text-dim)' }}>Loading…</p>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {profiles.map(p => (
              <button
                key={p.id}
                onClick={() => pickProfile(p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '0.75rem 1rem', background: 'var(--surface2)',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                  color: 'var(--text)', fontSize: '1rem', cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: '1.4rem' }}>{p.avatar || '👤'}</span>
                <span>{p.display_name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Screen 2: enter PIN ──
  return (
    <div style={wrapperStyle}>
      <div style={cardStyle}>
        <button
          onClick={() => setSelected(null)}
          style={{
            background: 'none', border: 'none', color: 'var(--text-dim)',
            fontSize: '0.85rem', marginBottom: 12, cursor: 'pointer',
          }}
        >
          ← back
        </button>

        <div style={{ fontSize: 32, marginBottom: 8 }}>{selected.avatar || '👤'}</div>
        <h1 style={{ fontFamily: 'var(--mono)', fontSize: '1.1rem', color: 'var(--accent)', marginBottom: 20 }}>
          Hi {selected.display_name}, enter your PIN
        </h1>

        {/* PIN dots display */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <div key={i} style={{
              width: 14, height: 14, borderRadius: '50%',
              background: i < pin.length ? 'var(--accent)' : 'var(--surface2)',
              border: '1px solid var(--border)',
            }} />
          ))}
        </div>

        {error && (
          <p style={{ color: '#e05c5c', fontSize: '0.8rem', marginBottom: 12 }}>{error}</p>
        )}

        {/* Number pad */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
          marginBottom: 16,
        }}>
          {['1','2','3','4','5','6','7','8','9'].map(d => (
            <button key={d} onClick={() => handleKeyPress(d)} style={keypadStyle}>{d}</button>
          ))}
          <button onClick={handleBackspace} style={keypadStyle}>⌫</button>
          <button key="0" onClick={() => handleKeyPress('0')} style={keypadStyle}>0</button>
          <button onClick={handleSubmit} style={{ ...keypadStyle, background: 'var(--accent)', color: '#0e0f11' }}>✓</button>
        </div>
      </div>
    </div>
  )
}

const keypadStyle = {
  padding: '0.9rem', fontSize: '1.1rem', fontWeight: 600,
  background: 'var(--surface2)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', color: 'var(--text)', cursor: 'pointer',
}
