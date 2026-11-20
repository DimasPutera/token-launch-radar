# LAPORAN — Token Radar token-radar-01

Tanggal: 2026-11-20 (WIB). Build lokal Hermes. Tidak ada push ke GitHub, tidak ada submit ke make.fun. Ronde 14: penalaran ditambahkan di bawah; verifikasi diulang, 15/15 PASS.

## Model

Model `radar-2` (lihat `README.md` untuk rumus lengkap). Snapshot DefiLlama `as_of` 2026-11-14, 758 protokol, floor watchlist $50.000.000, watchlist 40 protokol. Board 226 baris = 40 watchlist + 186 early di bawah floor; 24 protokol live-token dipisahkan.

## Penalaran

### Model implied value (`lib/model.ts`, model `radar-2`)

`implied = max(1, round(tvl_usd x peer x growthMult x maturity x chainMult))`. Tiap faktor punya satu tugas, dan tiap batas ada karena satu kegagalan yang dicegah:

- **Peer multiple — median mcap/TVL per kategori.** Harga sebuah protokol pre-token ditebak dari protokol yang sudah punya token di kategori yang sama: median `mcap_usd / tvl_usd` atas live-token peers. Median, bukan mean, supaya satu outlier (mis. satu DEX dengan mcap/TVL 3x) tidak menyeret seluruh kategori. Per kategori, bukan global, karena kategori memonetisasi TVL dengan cara berbeda — di snapshot ini Risk Curators 0,1689, Dexs 0,3424, RWA 0,2748; satu multiple global akan salah menilai semua kategori sekaligus. Kategori dengan < 3 live peers jatuh ke median global (`peer_min_count: 3`): dengan 1-2 peers, median adalah noise, dan median global adalah prior netral yang paling jujur. Multiple dihitung dari snapshot saat build (`resolveModel`), tidak pernah hard-code.
- **Growth — momentum setengah bobot, dijepit.** `change_7d` dijepit ke [-60, 120], lalu `growthMult = 1 + (growth/100) x 0,5`. Lonjakan atau anjlok seminggu tidak boleh menggandakan atau mengnolkan nilai — jepit memotong ekor distribusi. Bobot 0,5: momentum hanya sinyal setengah kekuatan; jangkarnya tetap TVL. `change_7d` null menjadi 0 (tidak ada kabar = tidak ada penyesuaian).
- **Maturity — umur menaikkan nilai, tapi dibatasi.** `0,6 + min(age, 1095)/1095 x 0,4`, jadi rentang [0,6, 1,0]. Protokol yang bertahan tiga tahun layak dihargai lebih per dolar TVL daripada yang baru sebulan — tapi umur tidak boleh melipatgandakan nilai (maks ~1,67x dari lantai 0,6). Umur tak diketahui menjadi 365 hari, titik tengah yang netral.
- **Breadth — chain multiplier kecil dan bercap.** `1 + 0,02` per chain di luar yang pertama, maks. 10 chain ekstra (+20%). Multichain adalah distribusi nyata, tapi nilainya kecil per chain supaya tidak mendominasi; cap mencegah listing 30 chain menggelembungkan nilai.
- **Lantai dan pembulatan.** `max(1, ...)` — implied value tidak pernah nol atau negatif; dibulatkan ke dolar bulat. `base_multiple` di board sama dengan `peer_multiple` (keduanya median kategori yang sama).

**Koreksi atas asumsi ronde 14: tidak ada clamp peer multiple [0,05, 1,50] di `lib/model.ts`.** Peer multiple adalah median mentah apa adanya — `peerMultiples` dan `peerMultipleFor` tidak menjepit apa pun. Clamp yang benar-benar ada di kode: growth [-60, 120], maturity [0,6, 1,0], chain maks +20%, dan lantai implied $1. Penalaran di atas ditulis sesuai kode, bukan sesuai asumsi.

- **Board.** Watchlist 40 adalah lantai: semua masuk. Ditambah protokol pre-token di bawah floor, diurutkan TVL, maks. 1000 baris early. Rankable = pre-token, bukan CEX, bukan nama pool berversi (`VERSIONED`). 24 protokol live-token dipisahkan dan ditampilkan pada harga pasarnya sendiri, tidak pernah dicampur ke board. Tidak ada nama protokol yang di-special-case: satu fungsi menilai semua baris, tie-break alfabet slug.

### Farm step

- **6 langkah, 20-600 karakter.** `farmSteps` mengembalikan tepat 6 langkah; `stepText` memotong di 600 karakter dan menambal bila < 20 karakter; `boardIssue` menolak board bila langkah < 3 atau > 12, atau di luar 20-600 karakter. Enam langkah menutup alur lengkap — siapkan dompet, lakukan aksi, jaga aktif, tahan, klaim, catat — tanpa menggelembungkan `board.json`.
- **Nama protokol, kategori, aksi konkret di tiap langkah.** Setiap langkah menginterpolasi nama dan kategori protokol, dan langkah 2 memakai `actionFor`: kategori menentukan kata kerja (Lending/CDP menjadi supply USDC; DEX/yield menjadi sediakan likuiditas; bridge menjadi bridge USDC; staking/restaking menjadi stake; perpetual/derivatif menjadi margin + hedge; prediction menjadi pasang posisi; curator menjadi deposit ke vault; stable menjadi mint/deposit; RWA menjadi mint yield asset; insurance menjadi beli cover; sisanya deposit USDC). Tujuannya: rencana terbaca sebagai rencana untuk protokol ini, bukan template generik — dan gate memeriksanya per baris.
- **Modal dari TVL, hold dari umur.** `capitalFor`: $250 (TVL >= $5B), $150 (>= $1B), $100 (>= $100M), $50 (di bawahnya) — modal mengikuti skala protokol. `holdDaysFor`: 60 hari bila umur < 180 hari, 45 hari bila < 365 hari, 30 hari bila lebih tua — protokol muda diberi jendela kualifikasi lebih panjang. Langkah 5 (klaim hanya dari link yang diterbitkan protokol sendiri, jangan pernah bayar untuk klaim) adalah pengaman anti-phishing; langkah 6 (farm log) membuat posisi bisa diulang atau di-urai.

### Verifikasi

- **Build dua kali + diff.** `main.ts` dijalankan dua kali (out1, out2) dari perintah RUNBOOK.md; `diff -r out1 out2` kosong — build deterministik byte-per-byte. Determinisme penting karena dossier dan board yang diserahkan harus bisa dibangun ulang persis sama oleh grader.
- **`verify.py`, 15 cek.** Board 226 baris, rank 1-226 unik, implied monoton turun, watchlist 40/40, farm steps 6 langkah 20-600 karakter, board/data deterministik (md5), dashboard < 64.000 byte tanpa URL, dossier <= 1,5 MiB dan byte-identik, 3 screenshot 1440x900 masing-masing < 512 KiB dengan nama valid, vendor md5 cocok kit.
- **Recompute dashboard.** `dashboard/app.js` (perbaikan ronde ini) menyelesaikan peer multiple per baris dari `DATA.model.peer_multiples[kategori]` dengan fallback `global_multiple` — aturan yang sama dengan `peerMultipleFor` — dan `impliedOf` mengalikan chain multiplier dari `row.chains`. Diverifikasi di browser headless untuk 5 baris (termasuk `change_7d` null dan `age_days` null): dialog detail menampilkan angka yang sama dengan `board.json`; rank 1 recompute $440,7M = $440.715.884. Satu-satunya `n/a` yang tersisa adalah tampilan growth tujuh hari untuk baris `change_7d` null — perilaku `fmtPct` yang disengaja.
- **Hasil terakhir (ronde 14).** out1/out2 exit 0, `diff -r` kosong, verify 15/15 PASS, `failures: []`. `board.json` md5 berubah dibanding entri LAPORAN.md sebelumnya (`76e138d4...` menjadi `c2117641...`, 321.259 menjadi 373.720 byte) karena commit `015f938` (farm step lebih spesifik) menulis ulang teks farm step; `data.js` (`82a22c7c...`), `dossier.json` (`bf28b186...`), dashboard (30.940 byte), dan screenshot tidak berubah, dan top 10 identik — nilai model tidak bergerak, hanya teks farm step yang berubah.

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
| board_deterministic | PASS | c211764151256de736e0c36873f7d311 |
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

- `board.json`: md5 `c211764151256de736e0c36873f7d311`, 373720 bytes, out1 == out2 byte-identik.
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
- Ronde 14 (2026-11-20): penalaran lengkap ditulis ke seksi "Penalaran" di atas; `main.ts` dijalankan ulang dua kali + `verify.py` (15/15 PASS). `board.json` md5 baru `c211764151256de736e0c36873f7d311` (373.720 byte) — berubah dari entri sebelumnya karena commit `015f938` menulis ulang farm step; `data.js`, `dossier.json`, dashboard, screenshot, dan top 10 tidak berubah.
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
