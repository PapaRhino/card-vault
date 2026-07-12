import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import TypeBadge from './TypeBadge'

const TRAINER_TYPE_CODES = { Supporter: 'Su', Item: 'It', Tool: 'To', Stadium: 'St' }

function computeBulkAddress(card) {
  const base = card.base_name || card.card_name || ''
  const letter = (base.trim()[0] || '?').toUpperCase()

  if (card.game === 'Pokemon') {
    let cat = 'P'
    if (card.category === 'Trainer') {
      cat = TRAINER_TYPE_CODES[card.trainer_subtype] || card.trainer_subtype || 'Tr'
    } else if (card.category === 'Energy') {
      cat = 'E'
    }
    const ruleBoxSuffix = card.rule_box ? '.2' : ''
    return `PTCG.${cat}.${letter}${ruleBoxSuffix}`
  }

  return `${card.game}.${letter}`
}

export default function CardModal({ card, copies, isAdmin, onMove, onClose }) {
  const [locations, setLocations] = useState([])

  useEffect(() => {
    supabase
      .from('locations')
      .select('name, status')
      .order('name')
      .then(({ data }) => setLocations(data ?? []))
  }, [])

  if (!card) return null

  const boxCopies    = copies.filter(c => c.status === 'box')
  const deckCopies   = copies.filter(c => c.status === 'deck')
  const binderCopies = copies.filter(c => c.status === 'binder')

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 16, width: '100%', maxWidth: 560,
          maxHeight: '90dvh', overflowY: 'auto',
          padding: '1.5rem',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          {card.image_url ? (
            <img
              src={card.image_url}
              alt={card.card_name}
              style={{ width: 120, borderRadius: 8, flexShrink: 0, alignSelf: 'flex-start' }}
            />
          ) : (
            <div style={{
              width: 120, height: 168, borderRadius: 8, flexShrink: 0,
              background: 'var(--surface2)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem',
            }}>🃏</div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6, lineHeight: 1.3 }}>
              {card.card_name}
            </h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: 8 }}>
              {card.set_name} {card.card_number ? `· #${card.card_number}` : ''}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              <TypeBadge type={card.pokemon_type} />
              {card.trainer_subtype && (
                <TypeBadge type={card.trainer_subtype} />
              )}
              <span style={{
                background: 'var(--surface2)', color: 'var(--text-dim)',
                fontSize: '0.7rem', padding: '2px 8px', borderRadius: 20,
                fontWeight: 600, letterSpacing: '0.04em',
              }}>
                {card.game}
              </span>
            </div>
            {card.rarity && (
              <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                {card.rarity}{card.variance ? ` · ${card.variance}` : ''}
              </p>
            )}
            {card.artist && (
              <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: 4 }}>
                🖌 {card.artist}
              </p>
            )}
            {card.pokedex_number && (
              <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: 4, fontFamily: 'var(--mono)' }}>
                #{String(card.pokedex_number).padStart(4, '0')}
              </p>
            )}
          </div>
        </div>

       

        {/* Copies */}
        <div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            Copies ({copies.length})
          </p>

          {boxCopies.length > 0 && (
            <CopyGroup label="📦 In Box" copies={boxCopies} isAdmin={isAdmin} locations={locations} onMove={onMove} card={card} />
          )}
          {deckCopies.length > 0 && (
            <CopyGroup label="🎯 In Deck" copies={deckCopies} isAdmin={isAdmin} locations={locations} onMove={onMove} card={card} />
          )}
          {binderCopies.length > 0 && (
            <CopyGroup label="📒 In Binder" copies={binderCopies} isAdmin={isAdmin} locations={locations} onMove={onMove} card={card} />
          )}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: '1.25rem', width: '100%', padding: '0.6rem',
            background: 'transparent', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', color: 'var(--text-dim)',
            fontSize: '0.9rem',
          }}
        >
          Close
        </button>
      </div>
    </div>
  )
}

function CopyGroup({ label, copies, isAdmin, locations, onMove, card }) {
  const [editingId, setEditingId] = useState(null)

  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>{label}</p>
      {copies.map(c => (
        <div key={c.id} style={{
          padding: '0.4rem 0.75rem',
          background: 'var(--surface2)', borderRadius: 6,
          marginBottom: 4, fontSize: '0.8rem', color: 'var(--text-dim)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            {c.location_name && (
              <span style={{ color: 'var(--accent)' }}>
                {c.location_name}{c.bulk_address ? ` — ${c.bulk_address}` : ''}
              </span>
            )}
            {c.variant && c.variant !== 'Normal' && <span>{c.variant}</span>}
            {c.grade && c.grade !== 'Ungraded' && <span>{c.grade}</span>}
            {isAdmin && (
              <button
                onClick={() => setEditingId(editingId === c.id ? null : c.id)}
                style={{
                  background: 'transparent', border: '1px solid var(--border)',
                  borderRadius: 6, color: 'var(--text-dim)', fontSize: '0.7rem',
                  padding: '2px 8px', cursor: 'pointer', flexShrink: 0,
                }}
              >
                Move
              </button>
            )}
          </div>

          {isAdmin && editingId === c.id && (
            <MoveForm
              copy={c}
              card={card}
              locations={locations}
              onCancel={() => setEditingId(null)}
              onMove={(name, status, bulkAddress) => {
                onMove(c.id, name, status, bulkAddress)
                setEditingId(null)
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function MoveForm({ copy, card, locations, onMove, onCancel }) {
  const [choice, setChoice] = useState(copy.location_name ?? '')

  function handleMove() {
    const match = locations.find(l => l.name === choice)
    if (!match) return

    const bulkAddress = match.name === 'BULK' ? computeBulkAddress(card) : null
    onMove(match.name, match.status, bulkAddress)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
      {choice === 'BULK' && (
        <div className="subtle" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
          Will file under: {computeBulkAddress(card)}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6 }}>
        <select
          value={choice}
          onChange={e => setChoice(e.target.value)}
          style={{
            flex: 1, padding: '4px 8px', fontSize: '0.75rem',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 6, color: 'var(--text)',
          }}
        >
          <option value="" disabled>Choose a location…</option>
          {locations.map(l => (
            <option key={l.name} value={l.name}>{l.name} ({l.status})</option>
          ))}
        </select>
        <button
          onClick={handleMove}
          style={{
            background: 'var(--accent)', color: '#0e0f11', border: 'none',
            borderRadius: 6, fontSize: '0.75rem', padding: '4px 10px', cursor: 'pointer',
          }}
        >
          Save
        </button>
        <button
          onClick={onCancel}
          style={{
            background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)',
            borderRadius: 6, fontSize: '0.75rem', padding: '4px 10px', cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
