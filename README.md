# Token Radar — token-radar-01 (make.fun)
[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/DimasPutera/token-launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/DimasPutera/token-launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Pre-token protocols ranked by implied value. One snapshot in, one ranked board out. No network at build or run time: every byte shown comes from the sealed snapshot.

## Snapshot

- Source: DefiLlama protocol index (https://api.llama.fi/protocols), fetched 2026-11-14T01:18:33.201Z; snapshot `as_of` 2026-11-14.
- 758 protocols; watchlist floor $50,000,000 TVL; watchlist 40 protocols.
- Board: 226 rows — the 40 watchlist protocols plus 186 pre-token protocols below the floor (the early radar). 24 live-token protocols are set aside with their market caps, never mixed into the ranking.

## Model — radar-2

A protocol is pre-token when its index entry records no token (no market cap, no CoinGecko id, no symbol).

```
peer         = median(mcap_usd / tvl_usd) over live-token peers in the same category
               (fewer than 3 live peers in the category: fall back to the global median
                over all live-token protocols with tvl_usd > 0)
growth       = clamp(change_7d, -60, 120)
growthMult   = 1 + (growth / 100) x 0.5
maturity     = 0.6 + min(age_days, 1095) / 1095 x 0.4   (age_days unknown: 365)
chainMult    = 1 + 0.02 x min(max(chains - 1, 0), 10)
implied      = max(1, round(tvl_usd x peer x growthMult x maturity x chainMult))
```

Peer multiples are computed from the snapshot at build time (`resolveModel` in `lib/model.ts`), never hard-coded. Global median: 0.16889204487299375. Per-category multiples (rounded to 4 dp; exact values in `data.js` under `model.peer_multiples`):

| Category | Peer multiple | Category | Peer multiple |
|---|---|---|---|
| Lending | 0.1324 | Cross Chain Bridge | 1.2205 |
| Liquid Staking | 0.0343 | Dexs | 0.3424 |
| Yield | 0.1206 | Yield Aggregator | 0.0504 |
| Canonical Bridge | 0.7464 | CEX | 0.062 |
| Basis Trading | 0.4822 | RWA | 0.2748 |
| Bridge | 0.0884 | Onchain Capital Allocator | 0.0059 |
| Indexes | 0.1477 | CDP | 0.1687 |
| Privacy | 0.9691 |  |  |

Constants: growth_weight 0.5, growth_floor -60, growth_cap 120, maturity_floor 0.6, maturity_range 0.4, maturity_days 1095, unknown_age_days 365, chain_step 0.02, chain_extra_max 10, peer_min_count 3.

No protocol name is special-cased: the same function scores every row.

## Top 10 implied value

| Rank | Protokol | Kategori | TVL | Implied value | Peer multiple |
|---|---|---|---|---|---|
| 1 | Steakhouse Financial | Risk Curators | $2,753,981,495 | $440,715,884 | 0.1689 |
| 2 | Gauntlet | Risk Curators | $1,577,685,462 | $262,479,691 | 0.1689 |
| 3 | USDD | CDP | $1,055,793,606 | $150,347,953 | 0.1687 |
| 4 | Bittensor dTAO | Dexs | $376,026,255 | $77,272,598 | 0.3424 |
| 5 | OnRe | RWA | $308,882,355 | $66,090,736 | 0.2748 |
| 6 | OpenTrade | RWA | $241,501,527 | $58,771,160 | 0.2748 |
| 7 | Plume Vaults | RWA | $211,537,977 | $53,997,192 | 0.2748 |
| 8 | Nonce Capital | Risk Curators | $513,783,671 | $51,904,148 | 0.1689 |
| 9 | RockawayX | Risk Curators | $292,506,628 | $39,429,931 | 0.1689 |
| 10 | R25 | RWA | $198,206,607 | $37,425,639 | 0.2748 |

## Farm plan

Every board row carries 6 farm steps (20–600 characters each), derived per protocol from its category, chains, TVL and age: use a fresh wallet; take the qualifying action with capital sized to the protocol; make one qualifying action a week; hold the position at least N days; claim only from the protocol's own published rewards link, never pay to claim; keep a farm log.

## Dashboard

Static files in `dashboard/` (`index.html`, `app.js`, `app.css` — 29,543 bytes total, no `http(s)` URL anywhere). It reads `window.RADAR` from `data.js` beside it and renders the ranked board, search + category filter, pre-token / live-token tabs, and a per-protocol detail dialog with the model's inputs and the farm plan. State lives in the URL hash (`#q`, `#category`, `#p=<slug>`).

## Outputs

`main.ts` writes, per output directory: `board.json` (226 rows), `data.js` (`window.RADAR`), `dashboard/` (3 files), `screenshots/` (3 JPEGs), `dossier.json` (`makefun/dossier/v1`, rebuilt by the scorer from the output and compared byte-for-byte).

Caps: screenshot at most 512 KiB each, dossier at most 1.5 MiB, dashboard text at most 64 KiB.

## Verifikasi

`python3 scripts/verify.py <repo> <kit>` — 15/15 PASS, `failures: []`. Determinism byte-identik out1 == out2: `board.json` md5 `76e138d4059e640448e8bc640a57b23e`, `data.js` md5 `82a22c7c5e7d9f8f6f0899b60beb4d31`, `dossier.json` md5 `d5726116297ce6c65f41212090205042` (472,624 bytes). Screenshots: `board.jpg` 98,560 bytes, `detail.jpg` 137,593 bytes, `filtered.jpg` 95,156 bytes — ketiganya JPEG 1440x900. Hasil tiap cek ada di `LAPORAN.md`.

## Reproduce

```sh
npm install --no-save --no-audit --no-fund puppeteer-core
node scripts/shot.mjs   # serves out1/ on loopback, captures board/detail/filtered at 1440x900
MAKEFUN_OUTPUT_DIR=out1 node main.ts --input ~/workspace/makefun/token-radar-01/token-radar-01-kit/input/snapshot.json
MAKEFUN_OUTPUT_DIR=out2 node main.ts --input ~/workspace/makefun/token-radar-01/token-radar-01-kit/input/snapshot.json
diff -r out1 out2
python3 scripts/verify.py . ~/workspace/makefun/token-radar-01/token-radar-01-kit   # all checks, incl. byte-identical determinism
```

Requires a system Chromium (`/opt/meta-chromium/chrome` or the puppeteer cache build). No Chromium download. No GitHub push, no make.fun submit — local build + verification only.

## Assumptions and limits

- Implied value is a model, not a price; the peer multiple is a median over live-token peers, so a thin category falls back to the global median.
- The snapshot is a point-in-time sealed input (2026-11-14); re-running on a newer snapshot changes the board.
- Farm steps are generic operational guidance, not financial advice; costs are estimates carried in the step text.

---

[Entered on make.fun](https://make.fun/bounty/token-radar-01)
