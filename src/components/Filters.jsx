import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const GAMES   = ['Pokemon', 'MTG', 'YuGiOh', 'Lorcana']
const TYPES   = ['Fire','Water','Grass','Lightning','Psychic','Fighting',
                 'Darkness','Metal','Dragon','Fairy','Colorless','Trainer','Energy']
const SUBTYPES = ['Supporter','Item','Stadium','Tool','Special Energy']
const STATUSES = ['box','deck','binder']

export default function Filters({ filters, onChange, totals }) {
  const [locations, setLocations] = useState([])

  useEffect(() => {
    supabase
      .from('locations')
      .select('name, status')
      .order('name')
      .then(({ data }) => setLocations(data ?? []))
  }, [])

  function set(key, val) {
    onChange({ ...filters, [key]: val })
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '0.75rem',
    }}>
      {/* Search */}
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder="Search cards, sets, artists…"
          value={filters.search}
          onChange={e => set('search', e.target.value)}
          style={{
            width: '100%', padding: '0.7rem 1rem 0.7rem 2.5rem',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', color: 'var(--text)',
            fontSize: '0.9rem', outline: 'none',
          }}
        />
        <span style={{
          position: 'absolute', left: '0.8rem', top: '50%',
          transform: 'translateY(-50%)', color: 'var(--text-dim)',
        }}>🔍</span>
      </div>

      {/* Filter row */}
      <div style={{
        display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center',
      }}>
        <Select
          value={filters.game}
          onChange={v => set('game', v)}
          options={GAMES}
          placeholder="All games"
        />
        <Select
          value={filters.type}
          onChange={v => set('type', v)}
          options={TYPES}
          placeholder="All types"
          disabled={filters.game && filters.game !== 'Pokemon'}
        />
        <Select
          value={filters.subtype}
          onChange={v => set('subtype', v)}
          options={SUBTYPES}
          placeholder="All subtypes"
          disabled={filters.game && filters.game !== 'Pokemon'}
        />
        <Select
          value={filters.status}
          onChange={v => set('status', v)}
          options={STATUSES}
          placeholder="Storage type"
        />
        <Select
          value={filters.location}
          onChange={v => set('location', v)}
          options={locations.map(l => l.name)}
          placeholder="Any location"
        />

        {/* Clear */}
        {(filters.search || filters.game || filters.type || filters.subtype || filters.status || filters.location) && (
          <button
            onClick={() => onChange({ search: '', game: '', type: '', subtype: '', status: '', location: '' })}
            style={{
              padding: '0.5rem 0.75rem', fontSize: '0.8rem',
              background: 'transparent', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', color: 'var(--text-dim)',
            }}
          >
            Clear
          </button>
        )}

        {/* Totals */}
        <span style={{
          marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-dim)',
          fontFamily: 'var(--mono)',
        }}>
          {totals.shown} cards · {totals.copies} copies
        </span>
      </div>
    </div>
  )
}

function Select({ value, onChange, options, placeholder, disabled }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      style={{
        padding: '0.5rem 0.75rem',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', color: value ? 'var(--text)' : 'var(--text-dim)',
        fontSize: '0.8rem', outline: 'none',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}
