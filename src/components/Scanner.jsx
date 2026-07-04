import { useRef, useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

const TCGDEX_BASE = 'https://api.tcgdex.net/v2/en'

export default function Scanner({ onClose }) {
  const videoRef     = useRef(null)
  const canvasRef    = useRef(null)
  const streamRef    = useRef(null)

  const [cameras,    setCameras]    = useState([])
  const [cameraId,   setCameraId]   = useState('')
  const [scanning,   setScanning]   = useState(false)
  const [cardData,   setCardData]   = useState(null)
  const [tcgCard,    setTcgCard]    = useState(null)
  const [preview,    setPreview]    = useState(null)
  const [error,      setError]      = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [status,     setStatus]     = useState('')

  // Get available cameras
  useEffect(() => {
    async function getCameras() {
      try {
        // Request permission first
        await navigator.mediaDevices.getUserMedia({ video: true })
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter(d => d.kind === 'videoinput')
        setCameras(videoDevices)
        if (videoDevices.length > 0) setCameraId(videoDevices[0].deviceId)
      } catch (err) {
        setError('Camera access denied. Please allow camera access and refresh.')
      }
    }
    getCameras()
    return () => stopStream()
  }, [])

  // Start stream when camera selected
  useEffect(() => {
    if (!cameraId) return
    startStream(cameraId)
  }, [cameraId])

  async function startStream(deviceId) {
    stopStream()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      setError(`Could not start camera: ${err.message}`)
    }
  }

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  // Capture frame and send to API
  const handleScan = useCallback(async () => {
    if (!videoRef.current || scanning) return
    setScanning(true)
    setError(null)
    setCardData(null)
    setTcgCard(null)
    setSaved(false)

    try {
      // Grab frame from video
      const video  = videoRef.current
      const canvas = canvasRef.current
      canvas.width  = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0)

      // Get base64 JPEG
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
      const base64  = dataUrl.split(',')[1]
      setPreview(dataUrl)

      // Send to our Vercel function
      setStatus('Identifying card…')
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Scan failed')
      }

      const card = await res.json()
      setCardData(card)

      // Look up in TCGdex
      if (card.set_code && card.card_number) {
        setStatus('Looking up card data…')
        const localId = card.card_number.includes('/')
          ? card.card_number.split('/')[0].replace(/^0+/, '')
          : card.card_number
        const tcgRes = await fetch(
          `${TCGDEX_BASE}/sets/${card.set_code.toLowerCase()}/${localId}`
        )
        if (tcgRes.ok) {
          const tcg = await tcgRes.json()
          setTcgCard(tcg)
        }
      }

      setStatus('')
    } catch (err) {
      setError(err.message)
      setStatus('')
    } finally {
      setScanning(false)
    }
  }, [scanning])

  // Save confirmed card to database
  async function handleConfirm() {
    if (!cardData) return
    setSaving(true)
    setError(null)

    try {
      // Build card record
      const cardRecord = {
        game:            cardData.game ?? 'Pokemon',
        card_name:       tcgCard?.name ?? cardData.card_name,
        set_name:        tcgCard?.set?.name ?? cardData.set_code ?? '',
        set_code:        tcgCard?.set?.id ?? cardData.set_code?.toLowerCase() ?? null,
        card_number:     tcgCard?.localId ?? cardData.card_number ?? null,
        rarity:          tcgCard?.rarity ?? cardData.rarity ?? null,
        pokemon_type:    tcgCard?.types?.[0] ?? cardData.tcg_type ?? null,
        trainer_subtype: tcgCard?.trainerType ?? null,
        pokedex_number:  tcgCard?.dexId?.[0] ?? cardData.pokedex_number ?? null,
        artist:          tcgCard?.illustrator ?? cardData.illustrator ?? null,
        image_url:       tcgCard?.image ? `${tcgCard.image}/low.webp` : null,
        api_card_id:     tcgCard?.id ?? null,
        needs_review:    !tcgCard,
        review_reason:   !tcgCard ? 'Scanned card — no TCGdex match found' : null,
      }

      // Compute box location
      cardRecord.box_location = buildLocation(cardRecord)

      // Upsert card
      const { data: saved, error: cardErr } = await supabase
        .from('cards')
        .upsert(cardRecord, {
          onConflict: 'game,card_name,set_name,card_number,variance',
          ignoreDuplicates: false,
        })
        .select('id')
        .single()

      if (cardErr) throw new Error(cardErr.message)

      // Insert copy
      const { error: copyErr } = await supabase
        .from('copies')
        .insert({
          card_id:    saved.id,
          status:     'box',
          date_added: new Date().toISOString().split('T')[0],
        })

      if (copyErr) throw new Error(copyErr.message)

      setSaved(true)
      setStatus(`✓ Saved! ${cardRecord.box_location}`)

      // Reset after 2.5s for next card
      setTimeout(() => {
        setCardData(null)
        setTcgCard(null)
        setPreview(null)
        setSaved(false)
        setStatus('')
      }, 2500)

    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleRescan() {
    setCardData(null)
    setTcgCard(null)
    setPreview(null)
    setError(null)
    setStatus('')
    setSaved(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'var(--bg)', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1rem',
        padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
      }}>
        <button onClick={() => { stopStream(); onClose() }} style={{
          background: 'none', border: 'none', color: 'var(--text-dim)',
          fontSize: '1.25rem', padding: '0.25rem',
        }}>←</button>
        <h2 style={{ fontFamily: 'var(--mono)', fontSize: '1rem', color: 'var(--accent)' }}>
          Card Scanner
        </h2>

        {/* Camera selector */}
        {cameras.length > 1 && (
          <select
            value={cameraId}
            onChange={e => setCameraId(e.target.value)}
            style={{
              marginLeft: 'auto', padding: '0.35rem 0.6rem',
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: '0.8rem',
            }}
          >
            {cameras.map(c => (
              <option key={c.deviceId} value={c.deviceId}>
                {c.label || `Camera ${cameras.indexOf(c) + 1}`}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Main content */}
      <div style={{
        flex: 1, display: 'flex', gap: '1.5rem',
        padding: '1.25rem', overflow: 'auto',
        maxWidth: 1100, margin: '0 auto', width: '100%',
      }}>

        {/* Left: video feed */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{
            position: 'relative', background: '#000',
            borderRadius: 12, overflow: 'hidden',
            border: '1px solid var(--border)',
            aspectRatio: '16/9',
          }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {/* Card alignment guide */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <div style={{
                width: '45%', aspectRatio: '0.72',
                border: '2px dashed rgba(200,168,75,0.5)',
                borderRadius: 8,
              }} />
            </div>
          </div>

          {/* Hidden canvas for frame capture */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Scan button */}
          {!cardData && (
            <button
              onClick={handleScan}
              disabled={scanning || !cameraId}
              style={{
                padding: '1rem', fontSize: '1.1rem', fontWeight: 700,
                background: scanning ? 'var(--surface2)' : 'var(--accent)',
                color: scanning ? 'var(--text-dim)' : '#0e0f11',
                border: 'none', borderRadius: 'var(--radius)',
                transition: 'all 0.15s',
              }}
            >
              {scanning ? '⏳ Scanning…' : '📷 Scan Card'}
            </button>
          )}

          {status && (
            <p style={{
              textAlign: 'center', color: saved ? '#5a9e6f' : 'var(--text-dim)',
              fontSize: '0.9rem', fontFamily: 'var(--mono)',
            }}>
              {status}
            </p>
          )}

          {error && (
            <div style={{
              background: '#3d1a1a', border: '1px solid #7a2a2a',
              borderRadius: 'var(--radius)', padding: '0.75rem 1rem',
              color: '#e05c5c', fontSize: '0.85rem',
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Right: card result */}
        {(cardData || preview) && (
          <div style={{
            width: 320, display: 'flex', flexDirection: 'column', gap: '1rem',
            flexShrink: 0,
          }}>
            {/* Card image — prefer TCGdex, fall back to capture preview */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 200,
            }}>
              {tcgCard?.image ? (
                <img
                  src={`${tcgCard.image}/low.webp`}
                  alt={tcgCard.name}
                  style={{ width: '100%', borderRadius: 12 }}
                />
              ) : preview ? (
                <img src={preview} alt="Scanned card" style={{ width: '100%' }} />
              ) : (
                <span style={{ fontSize: '3rem' }}>🃏</span>
              )}
            </div>

            {/* Card details */}
            {cardData && (
              <div style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '1rem',
                display: 'flex', flexDirection: 'column', gap: '0.5rem',
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>
                  {tcgCard?.name ?? cardData.card_name}
                </h3>

                <Row label="Set" value={tcgCard?.set?.name ?? cardData.set_code} />
                <Row label="Number" value={tcgCard?.localId ?? cardData.card_number} />
                <Row label="Type" value={tcgCard?.types?.[0] ?? cardData.tcg_type} />
                {(tcgCard?.dexId?.[0] ?? cardData.pokedex_number) && (
                  <Row label="Pokédex" value={`#${String(tcgCard?.dexId?.[0] ?? cardData.pokedex_number).padStart(4,'0')}`} />
                )}
                {(tcgCard?.illustrator ?? cardData.illustrator) && (
                  <Row label="Illus." value={tcgCard?.illustrator ?? cardData.illustrator} />
                )}

                {/* Location */}
                <div style={{
                  marginTop: 8, padding: '0.6rem 0.75rem',
                  background: 'var(--surface2)', borderRadius: 8,
                  border: '1px solid var(--border)',
                }}>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
                    Location
                  </p>
                  <p style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem', color: 'var(--accent)' }}>
                    {buildLocation({
                      game: cardData.game,
                      pokemon_type: tcgCard?.types?.[0] ?? cardData.tcg_type,
                      trainer_subtype: tcgCard?.trainerType ?? null,
                      pokedex_number: tcgCard?.dexId?.[0] ?? cardData.pokedex_number,
                      card_name: tcgCard?.name ?? cardData.card_name,
                    })}
                  </p>
                </div>

                {!tcgCard && (
                  <p style={{ fontSize: '0.75rem', color: '#d4a017', marginTop: 4 }}>
                    ⚠️ No TCGdex match — will be flagged for review
                  </p>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 8 }}>
                  <button
                    onClick={handleRescan}
                    style={{
                      flex: 1, padding: '0.6rem',
                      background: 'transparent', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)', color: 'var(--text-dim)',
                      fontSize: '0.85rem',
                    }}
                  >
                    Rescan
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={saving || saved}
                    style={{
                      flex: 2, padding: '0.6rem',
                      background: saved ? '#2d5a3d' : 'var(--accent)',
                      color: saved ? '#5a9e6f' : '#0e0f11',
                      border: 'none', borderRadius: 'var(--radius)',
                      fontWeight: 700, fontSize: '0.85rem',
                    }}
                  >
                    {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Confirm & Save'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
      <span style={{ color: 'var(--text-dim)' }}>{label}</span>
      <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: '65%' }}>{value}</span>
    </div>
  )
}

const TYPE_ROWS = ['Fire','Water','Grass','Lightning','Psychic','Fighting','Darkness','Metal','Dragon','Fairy','Colorless']

function buildLocation({ game, card_name, pokemon_type, trainer_subtype, pokedex_number }) {
  if (game !== 'Pokemon') {
    const letter = (card_name ?? '?').replace(/^(A|An|The)\s+/i, '')[0]?.toUpperCase() ?? '?'
    return `${game} Box › ${letter}`
  }
  if (trainer_subtype === 'Supporter') return 'Pokemon Box › Row: Supporter'
  if (trainer_subtype === 'Item')      return 'Pokemon Box › Row: Item'
  if (trainer_subtype === 'Stadium' || trainer_subtype === 'Special Energy')
    return 'Pokemon Box › Row: Stadium + Special Energy'
  if (pokemon_type && TYPE_ROWS.includes(pokemon_type)) {
    const num = pokedex_number ? String(pokedex_number).padStart(4, '0') : '????'
    return `Pokemon Box › Row: ${pokemon_type} › #${num}`
  }
  return 'Pokemon Box › Row: Unknown'
}
