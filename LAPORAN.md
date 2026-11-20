# LAPORAN — Token Radar token-radar-01

Tanggal: 2026-11-20 (WIB). Build lokal Hermes. Tidak ada push ke GitHub, tidak ada submit ke make.fun.

## Model

Model `radar-2` (lihat `README.md` untuk rumus lengkap). Snapshot DefiLlama `as_of` 2026-11-14, 758 protokol, floor watchlist $50.000.000, watchlist 40 protokol. Board 226 baris = 40 watchlist + 186 early di bawah floor; 24 protokol live-token dipisahkan.

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

## Hasil verifikasi

Verifikasi akhir: `python3 scripts/verify.py <repo> <kit>`, dijalankan setelah 3 screenshot dibuat dan `main.ts` dijalankan dua kali (out1 dan out2). Hasil: 15/15 PASS, `failures: []`.

| Cek | Hasil | Detail |
|---|---|---|
| board_rows_226 | PASS | 226 rows |
| board_ranks_unique_1_226 | PASS |  |
| implied_monotonic_desc | PASS |  |
| watchlist_40_40 | PASS | 40/40 |
| farm_steps_6_len_20_600 | PASS |  |
| board_deterministic | PASS | 76e138d4059e640448e8bc640a57b23e |
| data_deterministic | PASS | 82a22c7c5e7d9f8f6f0899b60beb4d31 |
| dashboard_lt_64000_no_urls | PASS | 30940 bytes, urls in: none |
| dossier_exists | PASS |  |
| dossier_le_1_5MiB | PASS | out1=464412 out2=464412 |
| dossier_byte_identical | PASS | bf28b186873952e7fec0069ce9784a6f |
| screenshots_3 | PASS | ['board.jpg', 'detail.jpg', 'filtered.jpg'] |
| screenshots_1440x900_le_512KiB | PASS | board.jpg 98560 bytes 1440x900; detail.jpg 130376 bytes 1440x900; filtered.jpg 95156 bytes 1440x900 |
| screenshots_names_valid | PASS |  |
| vendor_md5_matches_kit | PASS | 5ba220c2671b81b1c453350f3235adf4 |

Kesimpulan verifikasi: SEMUA CEK LULUS (15/15, failures []).

## Artefak

- `board.json`: md5 `76e138d4059e640448e8bc640a57b23e`, 321259 bytes, out1 == out2 byte-identik.
- `data.js`: md5 `82a22c7c5e7d9f8f6f0899b60beb4d31`, 83149 bytes, out1 == out2 byte-identik.
- `dossier.json`: md5 `bf28b186873952e7fec0069ce9784a6f`, 464412 bytes, out1 == out2 byte-identik.
- `screenshots/`: board.jpg 98560 bytes, detail.jpg 130376 bytes, filtered.jpg 95156 bytes — ketiganya JPEG 1440x900, masing-masing < 512 KiB; tersalin identik ke out1/screenshots dan out2/screenshots.
- `dashboard/`: 30940 bytes total (< 64.000), tanpa URL http(s); `app.js` sengaja berbeda dari starter kit (perbaikan recompute, lihat "Catatan"), `app.css` dan `index.html` sama dengan starter kit.
- `vendor/makefun-board.ts`: md5 `5ba220c2671b81b1c453350f3235adf4` (cocok dengan kit starter).

## Cara reproduksi

```sh
npm install --no-save --no-audit --no-fund puppeteer-core
node scripts/shot.mjs
MAKEFUN_OUTPUT_DIR=out1 node main.ts --input <kit>/input/snapshot.json
MAKEFUN_OUTPUT_DIR=out2 node main.ts --input <kit>/input/snapshot.json
python3 scripts/verify.py <repo> <kit>
```

## Catatan

- Perbaikan recompute dashboard (2026-11-20, putaran ini): `dashboard/app.js` diperbaiki, `lib/model.ts` dan data tidak disentuh (md5 `board.json` dan `data.js` tidak berubah). Akar masalah ada dua, bukan satu: (1) `impliedOf` dan panel formula membaca `model.base_multiple` dari `DATA.model` global, padahal `data.js` tidak membawa field itu; (2) `impliedOf` tidak mengalikan chain multiplier, jadi sekadar mengisi `base_multiple` saja masih menghasilkan $367.3M untuk rank 1, bukan $440.7M. Perbaikan: `rowModel(row)` baru menyelesaikan peer multiple per baris dari `DATA.model.peer_multiples[kategori]` dengan fallback `DATA.model.global_multiple` (aturan yang sama dengan `peerMultipleFor` di `lib/model.ts`); `impliedOf` kini mengalikan chain multiplier dari `row.chains` (`1 + 0.02` per chain di luar yang pertama, maks. 10); dialog detail memakai satu hasil recompute (`recomputed`) untuk nilai dan perbandingan, plus dua baris baru (Peer multiple, Chain multiplier); panel formula kini menulis `peer_multiple` dan `chain_multiplier` beserta penjelasannya (global median dan aturan fallback) — tidak ada lagi `undefined`. Diverifikasi di browser headless untuk 5 baris (steakhouse-financial, gauntlet, bittensor-dtao, estate-protocol dengan `change_7d` null, lightning-network dengan `age_days` null): semuanya menampilkan "the same number board.json carries" dan tidak ada `undefined` di halaman. Rank 1: recompute $440.7M, sama dengan board ($440,715,884). Satu-satunya `n/a` yang tersisa adalah tampilan Seven-day growth untuk baris dengan `change_7d` null — perilaku `fmtPct` yang memang disengaja, bukan recompute.
- Screenshot diambil lewat hash URL (`#p=steakhouse-financial` untuk detail, `#category=Dexs` untuk filtered); dialog detail dikonfirmasi terbuka (`#detail[open]`) sebelum `detail.jpg` ditangkap.
- Riwayat: putaran sebelumnya sempat gagal — 2 percobaan shot gagal (kebijakan domain WebGL Chrome, exit 13) dan `main.ts` menolak karena `screenshots/` masih kosong. Diperbaiki dengan menambahkan `chrome-headless-shell` ke `scripts/shot.mjs`; setelah itu screenshot dibuat ulang, `main.ts` dijalankan dua kali, dan verifikasi akhir lulus 15/15 (lihat "Error mentah" di bawah untuk log putaran lama).

## Error mentah (putaran sebelumnya — sudah teratasi)

```
npm_ok=True shot_ok=False verify_pass=False

--- shot attempt 1 exit=1 ---
file:///home/hatch/workspace/makefun/token-radar-01/hermes-build/repo/node_modules/@puppeteer/browsers/lib/launch.js:346
                reject(new Error([
                       ^

Error: Failed to launch the browser process:  Code: 13

stderr:
[1120/155010.961343:ERROR:chrome/app/chrome_main_delegate.cc:1283] Hatch WebGL domain policy is required for browser startup

TROUBLESHOOTING: https://pptr.dev/troubleshooting

    at ChildProcess.onClose (file:///home/hatch/workspace/makefun/token-radar-01/hermes-build/repo/node_modules/@puppeteer/browsers/lib/launch.js:346:24)
    at ChildProcess.emit (node:events:526:24)
    at ChildProcess._handle.onexit (node:internal/child_process:294:12)

Node.js v26.7.0
--- shot attempt 2 exit=1 ---
(file yang sama, error yang sama)
--- main.ts out1 exit=1 ---
token radar: screenshots/ holds 0 images: hand in 3, the board, a detail view and a filtered view
--- main.ts out1 retry exit=1 ---
token radar: screenshots/ holds 0 images: hand in 3, the board, a detail view and a filtered view
--- main.ts out2 exit=1 ---
token radar: screenshots/ holds 0 images: hand in 3, the board, a detail view and a filtered view
--- main.ts out2 retry exit=1 ---
token radar: screenshots/ holds 0 images: hand in 3, the board, a detail view and a filtered view
```
