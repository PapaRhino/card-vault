export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const { image } = body
  if (!image) {
    return new Response(JSON.stringify({ error: 'No image provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const prompt = `You are a trading card identifier. Analyze this card image and extract the following information with high precision.

Return ONLY a JSON object with these exact fields, no other text:
{
  "game": "Pokemon" | "MTG" | "YuGiOh" | "Lorcana" | "Unknown",
  "card_name": "exact card name as printed",
  "set_code": "set abbreviation/code printed on card (e.g. DRI, BASE, SV1 etc)",
  "card_number": "collector number as printed (e.g. 143/182 or 54)",
  "illustrator": "illustrator name if visible",
  "pokedex_number": number or null (for Pokemon only, the NO. printed on card),
  "tcg_type": "the energy/color type symbol shown (Fire/Water/Grass/Lightning/Psychic/Fighting/Darkness/Metal/Dragon/Fairy/Colorless for Pokemon, or color for MTG etc)",
  "rarity": "rarity symbol if readable",
  "confidence": "high" | "medium" | "low"
}

For Pokemon cards:
- The set code is the small abbreviation near the bottom right (e.g. DRI, PAF, MEW)
- The collector number is formatted as NNN/TTT near the bottom right
- The Pokédex number is printed as "NO. XXXX" on the card
- The illustrator follows "Illus." near the bottom

If any field is not visible or readable, use null for that field.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: image,
              }
            },
            {
              type: 'text',
              text: prompt,
            }
          ]
        }]
      })
    })

    if (!response.ok) {
      const err = await response.text()
      return new Response(JSON.stringify({ error: `Anthropic API error: ${err}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text ?? ''

    // Parse JSON from response
    let cardData
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      cardData = JSON.parse(jsonMatch?.[0] ?? text)
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to parse card data', raw: text }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify(cardData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
