import TypeBadge from './TypeBadge'

export default function CardModal({ card, copies, onClose }) {
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

        {/* Location */}
        <div style={{
          background: 'var(--surface2)', borderRadius: 'var(--radius)',
          padding: '0.75rem 1rem', marginBottom: '1rem',
          border: '1px solid var(--border)',
        }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            Location
          </p>
          <p style={{ fontFamily: 'var(--mono)', fontSize: '0.85rem', color: 'var(--accent)' }}>
            {card.box_location ?? 'Unknown'}
          </p>
        </div>

        {/* Copies */}
        <div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            Copies ({copies.length})
          </p>

          {boxCopies.length > 0 && (
            <CopyGroup label="📦 In Box" copies={boxCopies} />
          )}
          {deckCopies.length > 0 && (
            <CopyGroup label="🎯 In Deck" copies={deckCopies} />
          )}
          {binderCopies.length > 0 && (
            <CopyGroup label="📒 In Binder" copies={binderCopies} />
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

function CopyGroup({ label, copies }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>{label}</p>
      {copies.map(c => (
        <div key={c.id} style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '0.4rem 0.75rem',
          background: 'var(--surface2)', borderRadius: 6,
          marginBottom: 4, fontSize: '0.8rem', color: 'var(--text-dim)',
        }}>
          <span>{c.condition ?? 'Unknown condition'}</span>
          {c.location_name && <span style={{ color: 'var(--accent)' }}>{c.location_name}</span>}
          {c.grade && c.grade !== 'Ungraded' && <span>{c.grade}</span>}
        </div>
      ))}
    </div>
  )
}
