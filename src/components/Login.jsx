import { useState } from 'react'

const SITE_PASSWORD = import.meta.env.VITE_SITE_PASSWORD

export default function Login({ onLogin }) {
  const [pw, setPw]     = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (pw === SITE_PASSWORD) {
      sessionStorage.setItem('tcg_auth', '1')
      onLogin()
    } else {
      setError('Wrong password')
      setPw('')
    }
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '2.5rem 2rem', width: '100%',
        maxWidth: 360, textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🃏</div>
        <h1 style={{ fontFamily: 'var(--mono)', fontSize: '1.25rem', color: 'var(--accent)', marginBottom: 8 }}>
          TCG Archive
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Enter the collection password
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={pw}
            onChange={e => { setPw(e.target.value); setError('') }}
            placeholder="Password"
            autoFocus
            style={{
              width: '100%', padding: '0.75rem 1rem',
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', color: 'var(--text)',
              fontSize: '1rem', outline: 'none', marginBottom: '0.75rem',
            }}
          />
          {error && (
            <p style={{ color: '#e05c5c', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{error}</p>
          )}
          <button type="submit" style={{
            width: '100%', padding: '0.75rem',
            background: 'var(--accent)', color: '#0e0f11',
            border: 'none', borderRadius: 'var(--radius)',
            fontWeight: 700, fontSize: '1rem',
          }}>
            Enter
          </button>
        </form>
      </div>
    </div>
  )
}
