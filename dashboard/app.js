// Token Radar dashboard. Reads window.RADAR (written beside dashboard/ by
// main.ts) and renders the board, the live-token view, the model panel and a
// detail view per protocol. No network: every byte shown is in data.js.
(function () {
  'use strict';
  var DATA = window.RADAR;
  if (!DATA) return;
  var M = DATA.model;
  var state = { q: '', category: 'all', chain: 'all', watch: false, sort: 'implied', dir: -1, tab: 'pre', selected: null };
  var $ = function (id) { return document.getElementById(id); };
  var usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return usd0.format(n);
  }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }
  function fmtAge(d) {
    if (d === null || d === undefined) return 'unknown';
    if (d >= 365) return (d / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(d)) + 'd';
  }
  function fmtMult(n) { return n.toFixed(4); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function chainsOf(r) { return (r.chains && r.chains.length) ? r.chains.slice(0, 2).join(', ') : 'an unnamed chain'; }

  // The model, recomputed in the page from the same snapshot figures the
  // board used: TVL x peer multiple x growth x maturity x breadth.
  function impliedOf(r) {
    var g = Math.min(M.growth_cap, Math.max(M.growth_floor, r.change_7d === null || r.change_7d === undefined ? 0 : r.change_7d));
    var gm = 1 + (g / 100) * M.growth_weight;
    var age = (r.age_days === null || r.age_days === undefined) ? M.unknown_age_days : r.age_days;
    var mm = M.maturity_floor + (Math.min(Math.max(age, 0), M.maturity_days) / M.maturity_days) * M.maturity_range;
    var bm = 1 + M.breadth_step * Math.min(Math.max((r.chains || []).length - 1, 0), M.breadth_max_extra_chains);
    return Math.max(1, Math.round(r.tvl_usd * r.peer_multiple * gm * mm * bm));
  }

  // Farm plan: the same derivation main.ts writes to board.json, from the
  // protocol's category, chains, TVL and age. No name is special-cased.
  function chainOf(p) { return p.chains && p.chains.length > 0 ? p.chains[0] : 'its main chain'; }
  function capitalFor(p) {
    if (p.tvl_usd >= 5e9) return 250;
    if (p.tvl_usd >= 1e9) return 150;
    if (p.tvl_usd >= 1e8) return 100;
    return 50;
  }
  function holdFor(age) {
    if (age === null || age === undefined) return 30;
    if (age < 180) return 60;
    if (age < 365) return 45;
    return 30;
  }
  function actionFor(p, cap, chain) {
    var c = (p.category || '').toLowerCase(), n = p.name;
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'Supply $' + cap + ' of USDC to ' + n + ' on ' + chain + ' and keep the position open.';
    if (c.indexOf('dex') >= 0 || c.indexOf('yield') >= 0 || c.indexOf('leveraged farm') >= 0) return 'Provide $' + cap + ' of liquidity to ' + n + "'s main pool on " + chain + ' and keep the position open.';
    if (c.indexOf('bridge') >= 0) return 'Bridge $' + cap + ' of USDC to ' + chain + ' through ' + n + ' and use the bridged funds in its app.';
    if (c.indexOf('staking') >= 0 || c.indexOf('restak') >= 0) return "Stake $" + cap + " of the chain's staking asset through " + n + ' and keep the receipt.';
    if (c.indexOf('perpetual') >= 0 || c.indexOf('derivative') >= 0) return 'Deposit $' + cap + ' of USDC as margin on ' + n + ' and open one small hedge.';
    if (c.indexOf('prediction') >= 0) return 'Fund $' + cap + ' and place one market position on ' + n + '.';
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0) return 'Deposit $' + cap + ' into a ' + n + ' vault on ' + chain + ' and keep the shares.';
    if (c.indexOf('stable') >= 0) return 'Mint or deposit $' + cap + ' of the stable asset through ' + n + ' on ' + chain + '.';
    if (c.indexOf('rwa') >= 0) return "Mint $" + cap + " of the protocol's yield asset on " + chain + ' and hold it.';
    if (c.indexOf('insurance') >= 0) return 'Buy $' + cap + ' of cover from ' + n + ' on ' + chain + ' and keep the policy.';
    if (c.indexOf('payment') >= 0) return 'Send and receive a test payment of $' + cap + ' through ' + n + ' on ' + chain + ' and keep the receipts.';
    if (c.indexOf('launchpad') >= 0) return 'Join a ' + n + ' sale or pool on ' + chain + ' with $' + cap + ' and keep the allocation receipt.';
    return 'Deposit $' + cap + ' of USDC into ' + n + ' on ' + chain + ' and keep the position open.';
  }
  function qualifyFor(p, chain) {
    var c = (p.category || '').toLowerCase(), n = p.name;
    if (c.indexOf('dex') >= 0) return 'Swap a small amount each week in the same ' + n + ' pool on ' + chain + ' so the activity repeats.';
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'Borrow a small amount against your ' + n + ' supply once, then repay it, to show both sides of the market.';
    if (c.indexOf('perpetual') >= 0 || c.indexOf('derivative') >= 0) return 'Place one small trade a week on ' + n + ' and close it the same day.';
    if (c.indexOf('bridge') >= 0) return 'Bridge part of the funds back through ' + n + ' and use its app again each week.';
    if (c.indexOf('yield') >= 0 || c.indexOf('leveraged farm') >= 0) return 'Compound the rewards ' + n + ' pays into the same position each week.';
    if (c.indexOf('staking') >= 0 || c.indexOf('restak') >= 0) return 'Vote in a ' + n + ' governance vote when one opens, or delegate the stake if voting is not offered.';
    if (c.indexOf('rwa') >= 0) return 'Check the yield ' + n + ' reports each week and hold the asset while it pays.';
    if (c.indexOf('prediction') >= 0) return 'Place one small market position a week on ' + n + ' and settle it before the next round.';
    if (c.indexOf('insurance') >= 0) return 'Review the cover ' + n + ' issued each month and renew it before it lapses.';
    if (c.indexOf('payment') >= 0) return 'Send one more test payment through ' + n + ' each week to a second wallet you control.';
    if (c.indexOf('launchpad') >= 0) return 'Check ' + n + ' for a new sale or pool each week and join only the ones you have read.';
    if (c.indexOf('stable') >= 0) return 'Move a small amount in and out of the ' + n + ' stable asset each week to keep the position active.';
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0) return "Check the " + n + " vault's allocation each week and add a small top-up once a month.";
    return 'Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.';
  }
  function stepText(s) {
    var t = s.text + ' Cost: ' + s.cost + '. Time: ' + s.time + '.';
    if (t.length > 600) t = t.slice(0, 596) + '...';
    if (t.length < 20) t = t + " Hold the position and check the protocol's own page.";
    return t;
  }
  function farmSteps(p) {
    var chain = chainOf(p), cap = capitalFor(p), hold = holdFor(p.age_days);
    return [
      { text: 'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.', cost: 'under $3 of gas for the first transaction', time: '5 minutes' },
      { text: actionFor(p, cap, chain), cost: '$' + cap + ' of capital and about $' + (cap >= 150 ? 8 : 4) + ' of gas', time: '15 minutes to set up' },
      { text: qualifyFor(p, chain), cost: 'about $2 of gas a week', time: '10 minutes a week' },
      { text: 'Hold the position for at least ' + hold + ' days so the activity is counted in more than one snapshot.', cost: 'the $' + cap + ' stays in the position', time: hold + ' days' },
      { text: "Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.", cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
      { text: 'Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.', cost: 'nothing but the log', time: '5 minutes' }
    ].map(stepText);
  }

  function readHash() {
    var h = window.location.hash.replace(/^#/, '');
    if (!h) return;
    var ps = new URLSearchParams(h);
    if (ps.get('q')) state.q = ps.get('q');
    if (ps.get('category')) state.category = ps.get('category');
    if (ps.get('chain')) state.chain = ps.get('chain');
    if (ps.get('watchlist') === '1') state.watch = true;
    if (ps.get('sort')) state.sort = ps.get('sort');
    if (ps.get('dir')) state.dir = ps.get('dir') === '1' ? 1 : -1;
    if (ps.get('tab') === 'live') state.tab = 'live';
    if (ps.get('p')) state.selected = ps.get('p');
  }
  function writeHash() {
    var ps = new URLSearchParams();
    if (state.q) ps.set('q', state.q);
    if (state.category !== 'all') ps.set('category', state.category);
    if (state.chain !== 'all') ps.set('chain', state.chain);
    if (state.watch) ps.set('watchlist', '1');
    if (state.sort !== 'implied') ps.set('sort', state.sort);
    if (state.dir === 1) ps.set('dir', '1');
    if (state.tab === 'live') ps.set('tab', 'live');
    if (state.selected) ps.set('p', state.selected);
    var s = ps.toString();
    window.history.replaceState(null, '', s ? '#' + s : window.location.pathname + window.location.search);
  }

  function filtered() {
    var q = state.q.trim().toLowerCase();
    return DATA.rows.filter(function (r) {
      if (state.category !== 'all' && (r.category || 'Other') !== state.category) return false;
      if (state.chain !== 'all' && !(r.chains || []).includes(state.chain)) return false;
      if (state.watch && !r.watchlist) return false;
      if (!q) return true;
      return [r.name, r.slug, r.category, (r.chains || []).join(' ')].join(' ').toLowerCase().indexOf(q) >= 0;
    });
  }
  function sorted(list) {
    var k = state.sort;
    return list.slice().sort(function (a, b) {
      var av, bv;
      if (k === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (k === 'tvl') { av = a.tvl_usd; bv = b.tvl_usd; }
      else if (k === 'growth') { av = a.change_7d === null ? -Infinity : a.change_7d; bv = b.change_7d === null ? -Infinity : b.change_7d; }
      else if (k === 'age') { av = a.age_days === null ? Infinity : a.age_days; bv = b.age_days === null ? Infinity : b.age_days; }
      else { av = a.implied_value_usd; bv = b.implied_value_usd; }
      if (av < bv) return -state.dir;
      if (av > bv) return state.dir;
      return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
    });
  }

  function badge(r) {
    return r.watchlist
      ? '<span class="badge watch">Watchlist</span>'
      : '<span class="badge early">Early</span>';
  }
  function rowHtml(r, max) {
    var g = r.change_7d === null ? 'n/a' : fmtPct(r.change_7d);
    var gc = r.change_7d === null ? '' : (r.change_7d >= 0 ? 'pos' : 'neg');
    var w = Math.max(3, Math.round((r.implied_value_usd / max) * 100));
    return '<tr data-slug="' + esc(r.slug) + '" tabindex="0"><td class="num">' + r.rank + '</td>' +
      '<td><div class="name"><b>' + esc(r.name) + '</b><span class="sub">' + esc(r.category || 'Other') + ' on ' + esc(chainsOf(r)) + '</span></div></td>' +
      '<td class="num">' + fmtUsd(r.tvl_usd) + '</td><td class="num ' + gc + '">' + g + '</td>' +
      '<td class="num">' + fmtAge(r.age_days) + '</td>' +
      '<td><div class="implied"><div class="bar" aria-hidden="true"><i style="width:' + w + '%"></i></div><span class="num">' + fmtUsd(r.implied_value_usd) + '</span></div></td>' +
      '<td>' + badge(r) + '</td></tr>';
  }

  function renderBoard() {
    var list = sorted(filtered());
    var max = DATA.rows.length ? DATA.rows[0].implied_value_usd : 1;
    $('rows').innerHTML = list.map(function (r) { return rowHtml(r, max); }).join('');
    $('empty').hidden = list.length > 0;
    $('board-panel').hidden = state.tab !== 'pre';
    $('live-panel').hidden = state.tab !== 'live';
    $('count').textContent = state.tab === 'pre'
      ? list.length + ' rows shown of ' + DATA.board_size
      : DATA.live.length + ' live-token protocols';
    $('tab-pre').setAttribute('aria-pressed', state.tab === 'pre' ? 'true' : 'false');
    $('tab-live').setAttribute('aria-pressed', state.tab === 'live' ? 'true' : 'false');
  }

  function renderStatic() {
    $('meta-asof').textContent = 'Snapshot ' + DATA.as_of;
    $('meta-model').textContent = DATA.model_version + ' model';
    $('foot-asof').textContent = 'Snapshot ' + DATA.as_of;
    $('stat-watch').textContent = DATA.watchlist_size + ' / ' + DATA.watchlist_size;
    $('stat-board').textContent = String(DATA.board_size);
    $('stat-live').textContent = String(DATA.live_size);
    var total = DATA.rows.reduce(function (n, r) { return n + r.implied_value_usd; }, 0);
    $('stat-total').textContent = fmtUsd(total);
    $('formula').textContent = 'implied = round( tvl_usd x peer_multiple x (1 + clamp(change_7d, ' + M.growth_floor + ', ' + M.growth_cap + ') / 100 x ' + M.growth_weight + ') x (' + M.maturity_floor + ' + min(age_days, ' + M.maturity_days + ') / ' + M.maturity_days + ' x ' + M.maturity_range + ') x (1 + ' + M.breadth_step + ' x min(chains - 1, ' + M.breadth_max_extra_chains + ')) )  ·  peer multiple: category median of mcap / TVL over live tokens, global median ' + DATA.peer_global.toFixed(3) + ' when a category has fewer than ' + M.peer_min_live + ' live protocols, clamped ' + M.peer_floor + '–' + M.peer_cap + '.';
    $('spotlight').innerHTML = DATA.rows.slice(0, 10).map(function (r) {
      return '<li data-slug="' + esc(r.slug) + '" tabindex="0"><span class="rk">#' + r.rank + ' · ' + esc(r.category || 'Other') + '</span><b>' + esc(r.name) + '</b><span class="val">' + fmtUsd(r.implied_value_usd) + '</span><span class="sub2">TVL ' + fmtUsd(r.tvl_usd) + ' · 7d ' + fmtPct(r.change_7d) + '</span></li>';
    }).join('');
    $('live-rows').innerHTML = DATA.live.map(function (r) {
      return '<tr><td><span class="badge live">Live</span></td><td><div class="name"><b>' + esc(r.name) + '</b><span class="sub">' + esc(r.category || 'Other') + ' on ' + esc(chainsOf(r)) + '</span></div></td>' +
        '<td class="num">' + fmtUsd(r.tvl_usd) + '</td><td class="num ' + (r.change_7d !== null && r.change_7d >= 0 ? 'pos' : 'neg') + '">' + fmtPct(r.change_7d) + '</td>' +
        '<td class="num">' + fmtUsd(r.mcap_usd) + '</td><td><span class="badge live">already trades</span></td></tr>';
    }).join('');
    $('peer-rows').innerHTML = DATA.peer_table.map(function (p) {
      return '<tr><td>' + esc(p.category) + '</td><td class="num">' + p.live_count + '</td><td class="num">' + p.peer_multiple.toFixed(3) + '</td></tr>';
    }).join('');
    var cats = Array.from(new Set(DATA.rows.map(function (r) { return r.category || 'Other'; }))).sort();
    var chs = Array.from(new Set(DATA.rows.reduce(function (a, r) { return a.concat(r.chains || []); }, []))).sort();
    $('category').innerHTML = '<option value="all">All categories</option>' + cats.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join('');
    $('chain').innerHTML = '<option value="all">All chains</option>' + chs.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join('');
    $('category').value = state.category;
    $('chain').value = state.chain;
    $('q').value = state.q;
    $('watch').checked = state.watch;
    $('sort').value = state.sort;
    $('dir').value = String(state.dir);
  }

  var dialog = $('detail');
  function openDetail(slug) {
    var row = null;
    for (var i = 0; i < DATA.rows.length; i++) if (DATA.rows[i].slug === slug) { row = DATA.rows[i]; break; }
    if (!row) return;
    state.selected = slug;
    writeHash();
    var recomputed = impliedOf(row);
    $('detail-rank').textContent = 'Rank ' + row.rank + ' of ' + DATA.board_size + (row.watchlist ? ' · Watchlist' : ' · Early');
    $('detail-title').textContent = row.name;
    $('detail-sub').textContent = (row.category || 'Other') + ' on ' + ((row.chains || []).join(', ') || 'an unnamed chain') + ' · listed ' + (row.listed_at || 'date unknown') + ' · no token on record';
    var eq = [
      ['TVL', fmtUsd(row.tvl_usd)], ['7d change', fmtPct(row.change_7d)], ['Age with no token', fmtAge(row.age_days)],
      ['Peer multiple (' + (row.category || 'Other') + ')', fmtMult(row.peer_multiple)],
      ['Growth multiplier', fmtMult(row.growth_multiplier)], ['Maturity multiplier', fmtMult(row.maturity_multiplier)],
      ['Breadth multiplier (' + (row.chains || []).length + ' chains)', fmtMult(row.breadth_multiplier)]
    ];
    $('detail-eq').innerHTML = eq.map(function (p) {
      return '<div><span>' + esc(p[0]) + '</span><b class="num">' + esc(p[1]) + '</b></div>';
    }).join('') + '<div class="total"><span>Implied value</span><b class="num">' + fmtUsd(row.implied_value_usd) + '</b></div>';
    $('detail-recompute').textContent = 'The page recomputes this row as ' + fmtUsd(recomputed) + (recomputed === row.implied_value_usd ? ', sama dengan board.json.' : ', which differs from the board value ' + fmtUsd(row.implied_value_usd) + ' — the data would be stale.') + ' This is a model estimate, not a price.';
    $('detail-steps').innerHTML = farmSteps(row).map(function (s) {
      var ci = s.indexOf(' Cost: '), ti = s.indexOf(' Time: ');
      var action = ci >= 0 ? s.slice(0, ci) : s;
      var cost = ci >= 0 ? s.slice(ci + 7, ti >= 0 ? ti : s.length) : '';
      var time = ti >= 0 ? s.slice(ti + 7).replace(/\.$/, '') : '';
      return '<li><b>' + esc(action) + '</b><span class="chips"><span class="chip">Cost: <b>' + esc(cost) + '</b></span><span class="chip">Time: <b>' + esc(time) + '</b></span></span></li>';
    }).join('');
    if (typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
    else dialog.setAttribute('open', '');
  }
  function closeDetail() {
    if (dialog.open) dialog.close();
    state.selected = null;
    writeHash();
  }

  function sync() { writeHash(); renderBoard(); }
  $('q').addEventListener('input', function () { state.q = $('q').value; sync(); });
  $('category').addEventListener('change', function () { state.category = $('category').value; sync(); });
  $('chain').addEventListener('change', function () { state.chain = $('chain').value; sync(); });
  $('watch').addEventListener('change', function () { state.watch = $('watch').checked; sync(); });
  $('sort').addEventListener('change', function () { state.sort = $('sort').value; sync(); });
  $('dir').addEventListener('change', function () { state.dir = parseInt($('dir').value, 10) || -1; sync(); });
  $('tab-pre').addEventListener('click', function () { state.tab = 'pre'; sync(); });
  $('tab-live').addEventListener('click', function () { state.tab = 'live'; sync(); });
  $('clear').addEventListener('click', function () {
    state.q = ''; state.category = 'all'; state.chain = 'all'; state.watch = false;
    $('q').value = ''; $('category').value = 'all'; $('chain').value = 'all'; $('watch').checked = false;
    sync();
  });
  $('detail-close').addEventListener('click', closeDetail);
  dialog.addEventListener('close', function () { state.selected = null; writeHash(); });
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-slug]');
    if (t) openDetail(t.getAttribute('data-slug'));
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && dialog.open) closeDetail();
    if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.getAttribute && e.target.getAttribute('data-slug')) {
      e.preventDefault();
      openDetail(e.target.getAttribute('data-slug'));
    }
  });

  readHash();
  renderStatic();
  renderBoard();
  if (state.selected) openDetail(state.selected);
})();
