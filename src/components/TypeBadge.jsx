const TYPE_COLORS = {
  Fire: '#e8593c', Water: '#3b8bd4', Grass: '#5aa632',
  Lightning: '#d4a017', Psychic: '#b44fa0', Fighting: '#c75c2a',
  Darkness: '#4a5568', Metal: '#718096', Dragon: '#1e6fa5',
  Fairy: '#d48fbf', Colorless: '#6b7280',
  Trainer: '#2d7a5f', Energy: '#2d7a5f',
}
const TEXT_COLORS = {
  Lightning: '#0e0f11', Fairy: '#0e0f11', Colorless: '#e8e9ec',
}

export default function TypeBadge({ type }) {
  if (!type) return null
  const bg = TYPE_COLORS[type] ?? '#555'
  const fg = TEXT_COLORS[type] ?? '#fff'
  return (
    <span style={{
      display: 'inline-block',
      background: bg, color: fg,
      fontSize: '0.7rem', fontWeight: 700,
      padding: '2px 8px', borderRadius: 20,
      letterSpacing: '0.04em', textTransform: 'uppercase',
    }}>
      {type}
    </span>
  )
}
