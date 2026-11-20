// main.ts — token radar: snapshot masuk, board + dashboard + dossier keluar.
//
// Pipa yang dijalankan file ini, ujung ke ujung:
//
//   1. snapshot  — dibaca dari --input (file JSON, atau direktori yang
//      memuat snapshot.json; default /input).
//   2. board      — lib/model.ts mengubah snapshot jadi board berperingkat
//      (buildRadar) dan memeriksa board itu lolos gate (boardIssue).
//   3. artefak    — board.json dan data.js ditulis ke direktori output
//      (MAKEFUN_OUTPUT_DIR, default /output), lalu dashboard/ dan
//      screenshots/ dari repo disalin ke sana.
//   4. dossier    — terakhir, vendor/makefun-board.ts membangun dossier.json
//      dari dashboard/ dan screenshots/ yang sudah disalin, jadi dossier
//      selalu menggambarkan persis apa yang ada di output.
//
// Semua keluaran deterministik: snapshot yang sama selalu menghasilkan
// byte board.json, data.js, dan dossier.json yang sama.
//
//   node main.ts --input <file|dir>
//   MAKEFUN_OUTPUT_DIR=out1 node main.ts --input <kit>/input/snapshot.json
//
// Kode keluar: 0 sukses, 2 snapshot tidak ada / tidak terbaca,
// 1 gate menolak board atau screenshot kurang dari 3.

import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { boardIssue, buildRadar, dataScript, parseSnapshot } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

// Repo ini: dashboard/ dan screenshots/ tinggal di sebelah main.ts.
const REPO = dirname(fileURLToPath(import.meta.url));
// Batas teks dossier (README: dashboard text at most 64 KiB).
const DOSSIER_TEXT_CAP = 65536;
// Gate: dossier butuh cover, jadi minimal 3 screenshot.
const MIN_SCREENSHOTS = 3;

/** Tulis pesan ke stderr lalu keluar dengan kode yang diminta. */
function fail(code: number, message: string): never {
  console.error(`main.ts: ${message}`);
  process.exit(code);
}

/** Nilai flag --input, bentuk `--input <v>` atau `--input=<v>`; null bila tak ada. */
function inputFlag(argv: string[]): string | null {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '--input') return argv[i + 1] ?? null;
    if (arg.startsWith('--input=')) return arg.slice('--input='.length);
  }
  return null;
}

/** File snapshot dari argumen input: file itu sendiri, atau snapshot.json di dalam direktori. */
function snapshotFile(input: string): string {
  let info;
  try {
    info = statSync(input);
  } catch {
    fail(2, `snapshot tidak ada: ${input}`);
  }
  return info!.isDirectory() ? join(input, 'snapshot.json') : input;
}

/** Jumlah file biasa di sebuah direktori; 0 bila direktori tak ada. */
function fileCount(dir: string): number {
  try {
    return readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile()).length;
  } catch {
    return 0;
  }
}

function main(): void {
  const input = inputFlag(process.argv.slice(2)) ?? '/input';
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

  // 1. Snapshot: baca dan validasi bentuknya.
  const snapPath = snapshotFile(input);
  let text: string;
  try {
    text = readFileSync(snapPath, 'utf8');
  } catch {
    fail(2, `snapshot tidak bisa dibaca: ${snapPath}`);
  }
  let snapshot;
  try {
    snapshot = parseSnapshot(text!);
  } catch (err) {
    fail(2, `snapshot tidak valid: ${(err as Error).message}`);
  }

  // 2. Board + gate. buildRadar menghitung peer multiple dari snapshot,
  // membangun board, dan menyiapkan data dashboard dalam satu jalan.
  const { board, radar } = buildRadar(snapshot!);
  const issue = boardIssue(board, snapshot!);
  if (issue !== null) fail(1, `board ditolak: ${issue}`);
  if (fileCount(join(REPO, 'screenshots')) < MIN_SCREENSHOTS) {
    fail(1, `screenshot kurang dari 3 di ${join(REPO, 'screenshots')}`);
  }

  // 3. Artefak, sesuai urutan: board, data, dashboard, screenshots.
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'board.json'), `${JSON.stringify({ rows: board })}\n`);
  writeFileSync(join(outDir, 'data.js'), dataScript(radar));
  const dashOut = join(outDir, 'dashboard');
  const shotsOut = join(outDir, 'screenshots');
  rmSync(dashOut, { recursive: true, force: true });
  rmSync(shotsOut, { recursive: true, force: true });
  cpSync(join(REPO, 'dashboard'), dashOut, { recursive: true });
  cpSync(join(REPO, 'screenshots'), shotsOut, { recursive: true });

  // 4. Dossier terakhir, dari isi output yang sudah lengkap.
  writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, { text_max_bytes: DOSSIER_TEXT_CAP }));

  console.log(`board: ${board.length} rows, ${radar.live_size} live -> ${outDir}`);
}

main();
