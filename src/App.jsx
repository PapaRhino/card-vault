import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from './supabase'
import Login from './components/Login'
import Filters from './components/Filters'
import CardGrid from './components/CardGrid'
import CardModal from './components/CardModal'

const DEFAULT_FILTERS = { search: '', game: '', type: '', subtype: '', status: '' }
const PAGE_SIZE = 60

export default function App() {
  const [authed,    setAuthed]    = useState(() => sessionStorage.getItem('tcg_auth') === '1')
  const [cards,     setCards]     = useState([])
  const [allCopies, setAllCopies] = useState([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)
  const [filters,   setFilters]   = useState(DEFAULT_FILTERS)
  const [page,      setPage]      = useState(1)
  const [selected,  setSelected]  = useState(null)
  const [modalCopies, setModalCopies] = useState([])

  // Load all cards + copy counts on first auth
  useEffect(() => {
    if (!authed) return
    loadCards()
  }, [authed])

  async function loadCards() {
    setLoading(true)
    setError(null)
    try {
      // Fetch all cards with copy counts
      const { data: cardData, error: cardErr } = await supabase
        .from('cards')
        .select(`
          id, game, card_name, set_name, set_code, card_number,
          rarity, variance, pokemon_type, trainer_subtype,
          pokedex_number, artist, image_url, box_location, needs_review
        `)
        .neq('needs_review', true)
        .order('card_name')

      if (cardErr) throw cardErr

      // Fetch all active copies
      const { data: copyData, error: copyErr } = await supabase
        .from('copies')
        .select('id, card_id, status, location_name, condition, grade')
        .neq('status', 'sold_traded')

      if (copyErr) throw copyErr

      // Attach copy counts to cards
      const copyMap = {}
      for (const c of copyData) {
        copyMap[c.card_id] = (copyMap[c.card_id] ?? 0) + 1
      }

      const enriched = cardData.map(c => ({
        ...c,
        copy_count: copyMap[c.id] ?? 0,
      })).filter(c => c.copy_count > 0)

      setCards(enriched)
      setAllCopies(copyData)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Filter cards client-side
  const filtered = useMemo(() => {
    const q    = filters.search.toLowerCase()
    const game = filters.game
    const type = filters.type
    const sub  = filters.subtype
    const stat = filters.status

    return cards.filter(c => {
      if (game && c.game !== game) return false
      if (type && c.pokemon_type !== type) return false
      if (sub  && c.trainer_subtype !== sub) return false
      if (stat) {
        const copies = allCopies.filter(cp => cp.card_id === c.id)
        if (!copies.some(cp => cp.status === stat)) return false
      }
      if (q) {
        const haystack = [
          c.card_name, c.set_name, c.artist,
          c.pokemon_type, c.trainer_subtype, c.rarity,
        ].filter(Boolean).join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [cards, allCopies, filters])

  const totalCopies = useMemo(() => {
    const ids = new Set(filtered.map(c => c.id))
    return allCopies.filter(c => ids.has(c.card_id)).length
  }, [filtered, allCopies])

  const paginated = useMemo(() =>
    filtered.slice(0, page * PAGE_SIZE),
    [filtered, page]
  )

  const hasMore = paginated.length < filtered.length

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [filters])

  // Open modal
  const openCard = useCallback((card) => {
    const copies = allCopies.filter(c => c.card_id === card.id)
    setSelected(card)
    setModalCopies(copies)
  }, [allCopies])

  if (!authed) return <Login onLogin={() => setAuthed(true)} />

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '0.75rem 1.25rem',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(14,15,17,0.92)', backdropFilter: 'blur(8px)',
      }}>
        <span style={{ fontSize: '1.5rem' }}>🃏</span>
        <h1 style={{
          fontFamily: 'var(--mono)', fontSize: '1rem',
          color: 'var(--accent)', letterSpacing: '0.05em',
        }}>
          TCG Archive
        </h1>
        <button
          onClick={loadCards}
          disabled={loading}
          style={{
            marginLeft: 'auto', padding: '0.35rem 0.75rem',
            background: 'transparent', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', color: 'var(--text-dim)',
            fontSize: '0.75rem',
          }}
        >
          {loading ? '…' : '↻ Refresh'}
        </button>
      </header>

      {/* Main */}
      <main style={{ flex: 1, padding: '1rem 1.25rem', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        {/* Filters */}
        <div style={{ marginBottom: '1rem' }}>
          <Filters
            filters={filters}
            onChange={setFilters}
            totals={{ shown: filtered.length, copies: totalCopies }}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: '#3d1a1a', border: '1px solid #7a2a2a',
            borderRadius: 'var(--radius)', padding: '0.75rem 1rem',
            color: '#e05c5c', marginBottom: '1rem', fontSize: '0.875rem',
          }}>
            Error loading cards: {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-dim)' }}>
            Loading collection…
          </div>
        )}

        {/* Grid */}
        {!loading && (
          <>
            <CardGrid cards={paginated} onCardClick={openCard} />

            {hasMore && (
              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <button
                  onClick={() => setPage(p => p + 1)}
                  style={{
                    padding: '0.6rem 1.5rem',
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)', color: 'var(--text)',
                    fontSize: '0.875rem',
                  }}
                >
                  Load more ({filtered.length - paginated.length} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal */}
      {selected && (
        <CardModal
          card={selected}
          copies={modalCopies}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
