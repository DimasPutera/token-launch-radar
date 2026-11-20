# Token Radar

A token launch radar: it reads a frozen snapshot of DefiLlama protocols,
ranks the ones that record no token yet by an implied value, and shows a
reader how to farm each one. Implied value is a model estimate, not a price
or a promise. It does not predict whether or when a token is issued.

## Run it

Node 22 or later, standard library only, nothing to install:

```sh
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts --input path/to/snapshot.json
```

`--input` takes a snapshot file or a directory holding `snapshot.json`
(default `/input`). `--output` defaults to `$MAKEFUN_OUTPUT_DIR` or
`/output`. The run writes `board.json`, `data.js`, `dashboard/`,
`screenshots/` and `dossier.json` into the output directory, and prints a
one-line summary. It exits non-zero when the board fails its own checks or
when fewer than three screenshots are present.

Open the dashboard with any static server over the output directory, for
example `python3 -m http.server` inside `out/`, then open
`dashboard/index.html`. The page needs no network: all data ships in
`data.js`.

## The model (radar-2)

Every row is scored by one function of the snapshot's own figures. No
protocol name is special-cased, and every constant below is recomputed from
the snapshot on each run except the clamp and weight rules.

```
peer     = median(mcap_usd / tvl_usd) over live-token protocols in the same
           category; a category with fewer than 3 live protocols uses the
           global median instead. Clamped to [0.05, 1.50].
growth   = clamp(change_7d ?? 0, -60, 120)
growthMu = 1 + (growth / 100) * 0.5
age      = days from listed_at to as_of (unknown: 365)
maturity = 0.6 + min(age, 1095) / 1095 * 0.4
breadth  = 1 + 0.02 * min(max(chains.length - 1, 0), 9)
implied  = max(1, round(tvl_usd * peer * growthMu * maturity * breadth))
```

Each factor, in words:

- **Peer multiple.** What the market already pays for a dollar of TVL in
  this category. It is the median market-cap-to-TVL ratio of the
  live-token protocols in the same category, taken from the same snapshot.
  Thin categories (fewer than 3 live protocols) fall back to the global
  median, which is 0.214 in this snapshot. The clamp keeps a single
  outlier category from dominating the board.
- **Growth.** Seven-day TVL change, clamped to −60%…+120%, with half
  weight: a protocol growing fast scores higher, a shrinking one lower,
  but neither can run away with the ranking.
- **Maturity.** How long the protocol has run with no token on record,
  capped at three years. Older protocols score closer to the full
  multiple; a protocol with no listing date counts as 365 days.
- **Breadth.** One extra chain adds 2%, up to 1.18 for ten or more chains:
  a protocol live on many chains has more surface for a launch.

### The board

- **Watchlist (40):** every protocol in the snapshot's watchlist — TVL at
  or above $50,000,000 with no token on record. The watchlist is the floor,
  never the ceiling.
- **Early (186):** every other rankable pre-token protocol below the floor
  — pre-token, not a CEX, name not ending in a version marker.
- **Total: 226 rows**, ranked by implied value, rank 1 first.
- **Live token (24):** the 24 live-token protocols with the largest market
  cap (excluding CEX), shown apart with their real market caps, never
  mixed into the ranking.

Each board row carries a six-step farm plan derived from the protocol's own
record (category, chains, TVL, age): a fresh wallet, the main position
(capital sized from TVL: $250 / $150 / $100 / $50), a weekly qualifying
action per category, a hold window (60 / 45 / 30 days by age), claiming
only from the protocol's own points page, and a farm log. The dashboard
regenerates the same plan from the same inputs, so the page and
`board.json` always agree — and the detail view recomputes the row's
implied value in the page and checks it against the board.

## Repo layout

```
main.ts                  entry point: snapshot in, board + dashboard + dossier out
lib/model.ts             the radar-2 model, the farm plans, the board builder
dashboard/index.html     the page (static shell; data filled in by app.js)
dashboard/app.css        dark theme, system fonts only, no network
dashboard/app.js         rendering, filters, sorting, detail view, farm plans
vendor/makefun-board.ts  make.fun dossier library, copied byte-for-byte
screenshots/             three screenshots (board, detail, filtered view)
LICENSE                  MIT
```

## Data source

DefiLlama protocol index, frozen snapshot dated 2026-11-14
(`input/snapshot.json` in the kit): 758 protocols at or above $5,000,000
of TVL, with a 40-protocol watchlist at the $50,000,000 floor. The snapshot
is read-only input; the entry never fetches anything.
