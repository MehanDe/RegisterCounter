(() => {
  'use strict';
  // v = value in cents, roll = units per coin roll (0 = no roll)
  const DENOMS = [
    { id: 'c5',   label: '5¢',   sub: 'Nickel',  v: 5,     roll: 40, type: 'coin' },
    { id: 'c10',  label: '10¢',  sub: 'Dime',    v: 10,    roll: 50, type: 'coin' },
    { id: 'c25',  label: '25¢',  sub: 'Quarter', v: 25,    roll: 40, type: 'coin' },
    { id: 'c50',  label: '50¢',  sub: 'Half',    v: 50,    roll: 0,  type: 'coin' },
    { id: 'd1',   label: '$1',   sub: 'Loonie',  v: 100,   roll: 25, type: 'coin' },
    { id: 'd2',   label: '$2',   sub: 'Toonie',  v: 200,   roll: 25, type: 'coin' },
    { id: 'b5',   label: '$5',   sub: 'bill',    v: 500,   roll: 0,  type: 'bill' },
    { id: 'b10',  label: '$10',  sub: 'bill',    v: 1000,  roll: 0,  type: 'bill' },
    { id: 'b20',  label: '$20',  sub: 'bill',    v: 2000,  roll: 0,  type: 'bill' },
    { id: 'b50',  label: '$50',  sub: 'bill',    v: 5000,  roll: 0,  type: 'bill' },
    { id: 'b100', label: '$100', sub: 'bill',    v: 10000, roll: 0,  type: 'bill' },
  ];
  const CELLS = [];
  DENOMS.forEach(d => { if (d.roll) CELLS.push({ id: d.id, f: 'r' }); CELLS.push({ id: d.id, f: 'c' }); });

  const KEY = 'cashcount.v1';
  const money = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' });
  const fmt = cents => money.format(cents / 100);
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const newDrawer = n => ({ name: 'Drawer ' + n, target: 0, data: {} });
  let state = load();
  let sel = CELLS[0];
  let fresh = true; // next digit replaces the selected value

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && Array.isArray(s.drawers) && s.drawers.length) {
        s.active = Math.min(s.active || 0, s.drawers.length - 1);
        return s;
      }
    } catch (e) {}
    return { active: 0, drawers: [newDrawer(1)] };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  const cur = () => state.drawers[state.active];
  const entry = (dr, id) => dr.data[id] || (dr.data[id] = { r: 0, c: 0 });
  const pieces = (dr, d) => { const e = dr.data[d.id] || { r: 0, c: 0 }; return (e.r || 0) * d.roll + (e.c || 0); };
  const rowCents = (dr, d) => pieces(dr, d) * d.v;
  const drawerTotal = dr => DENOMS.reduce((s, d) => s + rowCents(dr, d), 0);

  function box(d, e, f, extra) {
    const val = (f === 'r' ? e.r : e.c) || 0;
    const on = sel.id === d.id && sel.f === f;
    return `<button class="box${extra || ''}${on ? ' sel' : ''}${on && fresh ? ' fresh' : ''}${val ? '' : ' zero'}" data-id="${d.id}" data-f="${f}">` +
      `<b>${val}</b>${f === 'r' ? `<i>×${d.roll}</i>` : ''}</button>`;
  }

  function rowHtml(dr, d) {
    const e = dr.data[d.id] || { r: 0, c: 0 };
    const cents = rowCents(dr, d), n = pieces(dr, d);
    const unit = d.type === 'bill' ? (n === 1 ? 'bill' : 'bills') : (n === 1 ? 'coin' : 'coins');
    return `<div class="row${sel.id === d.id ? ' active' : ''}">
      <div class="lab"><b>${d.label}</b><small>${d.sub}</small></div>
      ${d.roll ? box(d, e, 'r') : ''}
      ${box(d, e, 'c', d.roll ? '' : ' wide')}
      <div class="amt${cents ? '' : ' zero'}">${fmt(cents)}${n ? `<small>${n} ${unit}</small>` : ''}</div>
    </div>`;
  }

  function render() {
    const dr = cur();
    $('rows').innerHTML =
      `<div class="sec"><span>Coins</span><span>Rolls</span><span>Loose</span><span>Total</span></div>` +
      DENOMS.filter(d => d.type === 'coin').map(d => rowHtml(dr, d)).join('') +
      `<div class="sec"><span>Bills</span><span class="w2">How many</span><span>Total</span></div>` +
      DENOMS.filter(d => d.type === 'bill').map(d => rowHtml(dr, d)).join('');

    const total = drawerTotal(dr);
    $('drawerName').textContent = dr.name;
    $('total').textContent = fmt(total);
    const diff = $('diff');
    if (dr.target > 0) {
      const delta = total - dr.target;
      diff.className = 'diff ' + (delta >= 0 ? 'over' : 'short');
      diff.textContent = delta === 0 ? 'Balanced ✓' : (delta > 0 ? 'Over ' : 'Short ') + fmt(Math.abs(delta)) + '  (expected ' + fmt(dr.target) + ')';
    } else {
      diff.className = 'diff set';
      diff.textContent = 'Set expected total';
    }

    const d = DENOMS.find(x => x.id === sel.id);
    const what = sel.f === 'r' ? `rolls (${d.roll} per roll)` : d.type === 'bill' ? 'bills' : 'loose coins';
    $('ctx').innerHTML = `Typing <b>${d.label}${d.type === 'coin' ? ' ' + d.sub : ''}</b> · ${what}`;

    const s = document.querySelector('.box.sel');
    if (s) s.scrollIntoView({ block: 'nearest' });
    save();
  }

  function move(step) {
    const i = CELLS.findIndex(c => c.id === sel.id && c.f === sel.f);
    sel = CELLS[(i + step + CELLS.length) % CELLS.length];
    fresh = true;
    render();
  }

  function press(k) {
    if (navigator.vibrate) navigator.vibrate(5);
    if (k === 'next') return move(1);
    if (k === 'prev') return move(-1);
    const e = entry(cur(), sel.id), f = sel.f === 'r' ? 'r' : 'c';
    if (k === 'back') { e[f] = Math.floor((e[f] || 0) / 10); fresh = false; }
    else if (k === 'clear') { e[f] = 0; fresh = true; }
    else {
      const s = fresh ? k : '' + (e[f] || '') + k;
      e[f] = Math.min(99999, parseInt(s, 10) || 0);
      fresh = false;
    }
    render();
  }

  document.querySelector('.keys').addEventListener('click', ev => { const b = ev.target.closest('button'); if (b) press(b.dataset.k); });
  $('prevBtn').addEventListener('click', () => move(-1));
  $('nextBtn').addEventListener('click', () => move(1));
  $('rows').addEventListener('click', ev => {
    const b = ev.target.closest('.box[data-id]');
    if (b) { sel = { id: b.dataset.id, f: b.dataset.f }; fresh = true; render(); }
  });
  document.addEventListener('keydown', ev => {
    if (document.querySelector('dialog[open]')) return;
    if (/^[0-9]$/.test(ev.key)) press(ev.key);
    else if (ev.key === 'Backspace') press('back');
    else if (ev.key === 'ArrowRight' || ev.key === 'Enter' || ev.key === 'Tab') { ev.preventDefault(); press('next'); }
    else if (ev.key === 'ArrowLeft') press('prev');
  });

  function setTarget() {
    const dr = cur();
    const t = prompt('Expected total for this drawer in dollars (0 to turn off)', dr.target ? (dr.target / 100).toFixed(2) : '');
    if (t !== null) dr.target = Math.max(0, Math.round((parseFloat(t.replace(/[$,]/g, '')) || 0) * 100));
    render();
  }
  $('diff').addEventListener('click', setTarget);
  $('clearBtn').addEventListener('click', () => {
    const dr = cur();
    if (confirm('Clear all counts in ' + dr.name + '?')) { dr.data = {}; sel = CELLS[0]; fresh = true; render(); }
  });

  // Menu
  $('menuBtn').addEventListener('click', () => $('menuDlg').showModal());
  $('menuDlg').addEventListener('click', ev => {
    const a = ev.target.dataset && ev.target.dataset.a;
    if (!a) return;
    const dr = cur();
    $('menuDlg').close();
    if (a === 'rename') {
      const n = prompt('Drawer name', dr.name);
      if (n && n.trim()) dr.name = n.trim().slice(0, 30);
    } else if (a === 'target') {
      return setTarget();
    } else if (a === 'clearDrawer') {
      if (confirm('Clear all counts in ' + dr.name + '?')) { dr.data = {}; sel = CELLS[0]; fresh = true; }
    } else if (a === 'delete') {
      if (state.drawers.length === 1) alert('You need at least one drawer.');
      else if (confirm('Delete ' + dr.name + '?')) { state.drawers.splice(state.active, 1); state.active = 0; }
    } else if (a === 'clearAll') {
      if (confirm('Clear counts in every drawer?')) state.drawers.forEach(d => { d.data = {}; });
    }
    render();
  });

  // Drawers
  function renderDrawerList() {
    $('drawerList').innerHTML = state.drawers.map((d, i) =>
      `<button data-i="${i}" class="${i === state.active ? 'on' : ''}"><span>${esc(d.name)}</span><b>${fmt(drawerTotal(d))}</b></button>`).join('');
    $('allTotal').textContent = fmt(state.drawers.reduce((s, d) => s + drawerTotal(d), 0));
  }
  $('drawerBtn').addEventListener('click', () => { renderDrawerList(); $('drawersDlg').showModal(); });
  $('drawerList').addEventListener('click', ev => {
    const b = ev.target.closest('button[data-i]');
    if (b) { state.active = +b.dataset.i; sel = CELLS[0]; fresh = true; $('drawersDlg').close(); render(); }
  });
  function addDrawer() {
    state.drawers.push(newDrawer(state.drawers.length + 1));
    state.active = state.drawers.length - 1;
    sel = CELLS[0]; fresh = true;
    if ($('drawersDlg').open) $('drawersDlg').close();
    render();
  }
  $('addBtn').addEventListener('click', addDrawer);
  $('addDrawer').addEventListener('click', addDrawer);
  $('drawersDlg').addEventListener('click', ev => { if (ev.target.dataset && ev.target.dataset.a === 'close') $('drawersDlg').close(); });

  render();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
