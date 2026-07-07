// refresh-tcgdex-index.js
//
// Rebuilds the `tcgdex_card_index` Supabase table from the live TCGdex API.
// Run monthly (manually, or via a scheduled task/cron on a machine you control).
//
// Usage:
//   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SECRET_KEY=sb_secret_xxx node refresh-tcgdex-index.js
//
// Requires: npm install @supabase/supabase-js node-fetch (if on Node < 18)

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY env vars.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

const CONCURRENCY = 8;       // simultaneous detail fetches
const BATCH_UPSERT_SIZE = 500; // rows per Supabase upsert call
const RETRY_LIMIT = 3;

function stripSuffix(name, suffix) {
  if (!suffix) return name;
  return name.replace(new RegExp(`\\s*${escapeRegex(suffix)}$`), "").trim();
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function fetchWithRetry(url, attempt = 1) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.json();
  } catch (err) {
    if (attempt >= RETRY_LIMIT) throw err;
    await new Promise((r) => setTimeout(r, 500 * attempt));
    return fetchWithRetry(url, attempt + 1);
  }
}

function mapCardToRow(card) {
  const base = {
    id: card.id,
    name: card.name,
    base_name: stripSuffix(card.name, card.suffix),
    local_id: card.localId || "",
    local_id_num: parseInt(String(card.localId || "0").split("/")[0], 10) || 0,
    set_id: card.set?.id || "",
    set_name: card.set?.name || "",
    category: card.category || "Unknown",
    image: card.image || null,
    updated_at: new Date().toISOString(),
    suffix: null,
    rule_box: false,
    types: null,
    trainer_type: null,
    energy_type: null,
  };

  if (card.category === "Pokemon") {
    base.suffix = card.suffix || null;
    base.rule_box = Boolean(card.suffix); // ANY suffix counts as rule box, no exceptions
    base.types = card.types || null;
  } else if (card.category === "Trainer") {
    base.trainer_type = card.trainerType || null;
  } else if (card.category === "Energy") {
    base.energy_type = card.energyType || null;
  }

  return base;
}

async function processInBatches(items, size, worker) {
  const results = [];
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    const batchResults = await Promise.all(batch.map(worker));
    results.push(...batchResults);
    console.log(`  ...processed ${Math.min(i + size, items.length)}/${items.length}`);
  }
  return results;
}

async function main() {
  console.log("Fetching brief card list from TCGdex...");
  const briefList = await fetchWithRetry("https://api.tcgdex.net/v2/en/cards");
  console.log(`Got ${briefList.length} cards. Fetching full detail (concurrency=${CONCURRENCY})...`);

  const rows = await processInBatches(briefList, CONCURRENCY, async (brief) => {
    try {
      const card = await fetchWithRetry(`https://api.tcgdex.net/v2/en/cards/${brief.id}`);
      return mapCardToRow(card);
    } catch (err) {
      console.warn(`Failed to fetch detail for ${brief.id}: ${err.message}`);
      return null;
    }
  });

  const validRows = rows.filter(Boolean);
  console.log(`Fetched detail for ${validRows.length}/${briefList.length} cards. Upserting to Supabase...`);

  for (let i = 0; i < validRows.length; i += BATCH_UPSERT_SIZE) {
    const chunk = validRows.slice(i, i + BATCH_UPSERT_SIZE);
    const { error } = await supabase.from("tcgdex_card_index").upsert(chunk, { onConflict: "id" });
    if (error) {
      console.error(`Upsert failed for batch starting at ${i}:`, error.message);
    } else {
      console.log(`  upserted rows ${i}-${i + chunk.length}`);
    }
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
