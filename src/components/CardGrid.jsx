import TypeBadge from './TypeBadge'

const PLACEHOLDER = '🃏'

export default function CardGrid({ cards, onCardClick }) {
  if (cards.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-dim)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
        <p style={{ fontSize: '1rem' }}>No cards match your filters</p>
        <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Try broadening your search</p>
      </div>
    )
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
      gap: '0.75rem',
    }}>
      {cards.map(card => (
        <CardTile key={card.id} card={card} onClick={() => onCardClick(card)} />
      ))}
    </div>
  )
}

function CardTile({ card, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', overflow: 'hidden',
        cursor: 'pointer', textAlign: 'left', padding: 0,
        transition: 'border-color 0.15s, transform 0.15s',
        display: 'flex', flexDirection: 'column',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--accent)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.transform = 'none'
      }}
    >
      {/* Card image */}
      <div style={{
        width: '100%', aspectRatio: '0.72',
        background: 'var(--surface2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {card.image_url ? (
          <img
            src={card.image_url}
            alt={card.card_name}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: '2.5rem' }}>{PLACEHOLDER}</span>
        )}
      </div>

      {/* Card info */}
      <div style={{ padding: '0.5rem 0.6rem' }}>
        <p style={{
          fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.3,
          marginBottom: 4,
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {card.card_name}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          <TypeBadge type={card.pokemon_type} />
          {/* Copy count */}
          {card.copy_count > 1 && (
            <span style={{
              fontSize: '0.65rem', color: 'var(--text-dim)',
              background: 'var(--surface2)', padding: '1px 5px', borderRadius: 10,
            }}>
              ×{card.copy_count}
            </span>
          )}
        </div>
        <p style={{
          fontSize: '0.65rem', color: 'var(--text-dim)',
          marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {card.set_name}
        </p>
      </div>
    </button>
  )
}
