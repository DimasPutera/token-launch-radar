import hashlib, json, re, struct, sys
from pathlib import Path

repo = Path(sys.argv[1]); kit = Path(sys.argv[2])
snap = json.loads((kit / 'input' / 'snapshot.json').read_text())
out1, out2 = repo / 'out1', repo / 'out2'
res = {'checks': {}, 'failures': []}
def check(name, ok, detail=''):
    res['checks'][name] = {'ok': bool(ok), 'detail': str(detail)}
    if not ok: res['failures'].append(name)
def md5(p): return hashlib.md5(Path(p).read_bytes()).hexdigest()
def sha256(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def jpeg_dims(p):
    d = Path(p).read_bytes()
    assert d[:2] == b'\xff\xd8', 'not a JPEG'
    i = 2
    while i < len(d):
        if d[i] != 0xFF: i += 1; continue
        m = d[i+1]
        if m in (0xC0, 0xC1, 0xC2):
            return struct.unpack('>H', d[i+7:i+9])[0], struct.unpack('>H', d[i+5:i+7])[0]
        if m in (0xD8, 0xD9) or 0xD0 <= m <= 0xD7: i += 2; continue
        ln = struct.unpack('>H', d[i+2:i+4])[0]
        i += 2 + ln
    raise ValueError('no SOF marker')

b1 = json.loads((out1 / 'board.json').read_text())['rows']
b2 = json.loads((out2 / 'board.json').read_text())['rows']
watch = set(snap['watchlist'])
check('board_rows_226', len(b1) == 226, str(len(b1)) + ' rows')
check('board_ranks_unique_1_226', sorted(r['rank'] for r in b1) == list(range(1, len(b1) + 1)))
imp = [r['implied_value_usd'] for r in b1]
check('implied_monotonic_desc', all(imp[i] >= imp[i + 1] for i in range(len(imp) - 1)))
check('watchlist_40_40', len({r['slug'] for r in b1} & watch) == 40, str(len({r['slug'] for r in b1} & watch)) + '/40')
check('farm_steps_6_len_20_600', all(len(r.get('farm_steps') or []) == 6 and all(20 <= len(s) <= 600 for s in r['farm_steps']) for r in b1))
check('board_deterministic', md5(out1 / 'board.json') == md5(out2 / 'board.json'), md5(out1 / 'board.json'))
check('data_deterministic', md5(out1 / 'data.js') == md5(out2 / 'data.js'), md5(out1 / 'data.js'))
dash = sorted((repo / 'dashboard').iterdir())
total = sum(p.stat().st_size for p in dash)
urls = [p.name for p in dash if re.search(r'https?://', p.read_text(errors='ignore'))]
check('dashboard_lt_64000_no_urls', total < 64000 and not urls, str(total) + ' bytes, urls in: ' + str(urls or 'none'))
d1, d2 = out1 / 'dossier.json', out2 / 'dossier.json'
check('dossier_exists', d1.exists() and d2.exists())
if d1.exists() and d2.exists():
    check('dossier_le_1_5MiB', d1.stat().st_size <= 1572864 and d2.stat().st_size <= 1572864, 'out1=' + str(d1.stat().st_size) + ' out2=' + str(d2.stat().st_size))
    check('dossier_byte_identical', md5(d1) == md5(d2), md5(d1))
shots = sorted((repo / 'screenshots').glob('*'))
info = []
for p in shots:
    w, h = jpeg_dims(p)
    info.append({'name': p.name, 'bytes': p.stat().st_size, 'width': w, 'height': h})
check('screenshots_3', len(shots) == 3, str([s['name'] for s in info]))
check('screenshots_1440x900_le_512KiB', all(s['width'] == 1440 and s['height'] == 900 and s['bytes'] <= 524288 for s in info), str(info))
check('screenshots_names_valid', all(re.match(r'^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$', s['name']) for s in info))
v_repo = md5(repo / 'vendor' / 'makefun-board.ts'); v_kit = md5(kit / 'starter' / 'vendor' / 'makefun-board.ts')
check('vendor_md5_matches_kit', v_repo == v_kit, v_repo)
res['top10'] = [{'rank': r['rank'], 'name': r['name'], 'category': r['category'], 'tvl_usd': r['tvl_usd'], 'implied_value_usd': r['implied_value_usd'], 'peer_multiple': (r.get('model') or {}).get('peer_multiple')} for r in b1[:10]]
res['md5'] = {'board': md5(out1 / 'board.json'), 'data': md5(out1 / 'data.js'), 'dossier': md5(d1) if d1.exists() else None, 'vendor': v_repo}
res['sizes'] = {'board': (out1 / 'board.json').stat().st_size, 'data': (out1 / 'data.js').stat().st_size, 'dossier': d1.stat().st_size if d1.exists() else None, 'dashboard': total}
res['screenshots'] = info
res['snapshot'] = {'as_of': snap['as_of'], 'protocols': len(snap['protocols']), 'watchlist': len(snap['watchlist']), 'floor_usd': snap['floor_usd']}
res['dashboard_matches_kit_starter'] = {n: sha256(repo / 'dashboard' / n) == sha256(kit / 'starter' / 'dashboard' / n) for n in ('app.js', 'app.css', 'index.html')}
res['pass'] = not res['failures']
print(json.dumps(res, indent=1))
sys.exit(0 if res['pass'] else 1)
