(() => {
  'use strict';
  // v = value in cents, roll = units per coin roll (0 = no roll)
  const DENOMS = [
    { id: 'c5',   label: '5¢',   sub: 'Nickel',  v: 5,     roll: 40 },
    { id: 'c10',  label: '10¢',  sub: 'Dime',    v: 10,    roll: 50 },
    { id: 'c25',  label: '25¢',  sub: 'Quarter', v: 25,    roll: 40 },
    { id: 'c50',  label: '50¢',  sub: '',        v: 50,    roll: 0 },
    { id: 'd1',   label: '$1',   sub: 'Loonie',  v: 100,   roll: 25 },
    { id: 'd2',   label: '$2',   sub: 'Toonie',  v: 200,   roll: 25 },
    { id: 'b5',   label: '$5',   sub: '',        v: 500,   roll: 0 },
    { id: 'b10',  label: '$10',  sub: '',        v: 1000,  roll: 0 },
    { id: 'b20',  label: '$20',  sub: '',        v: 2000,  roll: 0 },
    { id: 'b50',  label: '$50',  sub: '',        v: 5000,  roll: 0 },
    { id: 'b100', label: '$100', sub: '',        v: 10000, roll: 0 },
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
  let sel = { id: 'c5', f: 'r' };

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
  const rowCents = (dr, d) => {
    const e = dr.data[d.id] || { r: 0, c: 0 };
    return ((e.r || 0) * d.roll + (e.c || 0)) * d.v;
  };
  const drawerTotal = dr => DENOMS.reduce((s, d) => s + rowCents(dr, d), 0);

  function render() {
    const dr = cur();
    $('rows').innerHTML = DENOMS.map(d => {
      const e = dr.data[d.id] || { r: 0, c: 0 };
      const isSel = (f) => sel.id === d.id && sel.f === f ? ' sel' : '';
      const rollCell = d.roll
        ? `<div class="cell${isSel('r')}${e.r ? '' : ' zero'}" data-id="${d.id}" data-f="r">${e.r || 0}×${d.roll}</div>`
        : `<div class="cell empty"></div>`;
      return `<div class="row">
        <div class="lab">${d.label}${d.sub ? `<small>${d.sub}</small>` : ''}</div>
        ${rollCell}
        <div class="cell${isSel('c')}${e.c ? '' : ' zero'}" data-id="${d.id}" data-f="c">${e.c || 0}</div>
        <div class="amt">${fmt(rowCents(dr, d))}</div></div>`;
    }).join('');
    const total = drawerTotal(dr);
    $('drawerName').textContent = dr.name;
    $('total').textContent = fmt(total);
    const diff = $('diff');
    if (dr.target > 0) {
      const delta = total - dr.target;
      diff.className = 'diff ' + (delta >= 0 ? 'over' : 'short');
      diff.textContent = delta === 0 ? 'Balanced' : (delta > 0 ? 'Over ' : 'Short ') + fmt(Math.abs(delta));
    } else { diff.className = 'diff'; diff.textContent = ''; }
    const s = document.querySelector('.cell.sel');
    if (s) s.scrollIntoView({ block: 'nearest' });
    save();
  }

  function press(k) {
    if (navigator.vibrate) navigator.vibrate(5);
    const i = CELLS.findIndex(c => c.id === sel.id && c.f === sel.f);
    if (k === 'next') { sel = CELLS[(i + 1) % CELLS.length]; return render(); }
    if (k === 'prev') { sel = CELLS[(i - 1 + CELLS.length) % CELLS.length]; return render(); }
    const e = entry(cur(), sel.id);
    if (k === 'back') e[sel.f] = Math.floor((e[sel.f] || 0) / 10);
    else e[sel.f] = Math.min(99999, parseInt('' + (e[sel.f] || '') + k, 10));
    render();
  }

  $('keypad').addEventListener('click', ev => { const b = ev.target.closest('button'); if (b) press(b.dataset.k); });
  $('rows').addEventListener('click', ev => {
    const c = ev.target.closest('.cell[data-id]');
    if (c) { sel = { id: c.dataset.id, f: c.dataset.f }; render(); }
  });
  document.addEventListener('keydown', ev => {
    if (/^[0-9]$/.test(ev.key)) press(ev.key);
    else if (ev.key === 'Backspace') press('back');
    else if (ev.key === 'ArrowRight' || ev.key === 'Enter' || ev.key === 'Tab') { ev.preventDefault(); press('next'); }
    else if (ev.key === 'ArrowLeft') press('prev');
  });

  function clearDrawer(dr) { dr.data = {}; }
  $('clearBtn').addEventListener('click', () => { if (confirm('Clear all counts in ' + cur().name + '?')) { clearDrawer(cur()); sel = CELLS[0]; render(); } });

  // Menu
  $('menuBtn').addEventListener('click', () => $('menuDlg').showModal());
  $('menuDlg').addEventListener('click', ev => {
    const a = ev.target.dataset && ev.target.dataset.a;
    if (!a) return;
    const dr = cur();
    if (a === 'rename') {
      const n = prompt('Drawer name', dr.name);
      if (n && n.trim()) dr.name = n.trim().slice(0, 30);
    } else if (a === 'target') {
      const t = prompt('Expected total for this drawer in dollars (0 to turn off)', dr.target ? (dr.target / 100).toFixed(2) : '');
      if (t !== null) dr.target = Math.max(0, Math.round((parseFloat(t.replace(/[$,]/g, '')) || 0) * 100));
    } else if (a === 'delete') {
      if (state.drawers.length === 1) alert('You need at least one drawer.');
      else if (confirm('Delete ' + dr.name + '?')) { state.drawers.splice(state.active, 1); state.active = 0; }
    } else if (a === 'clearAll') {
      if (confirm('Clear counts in every drawer?')) state.drawers.forEach(clearDrawer);
    }
    $('menuDlg').close();
    render();
  });

  // Drawers
  function renderDrawerList() {
    $('drawerList').innerHTML = state.drawers.map((d, i) =>
      `<button data-i="${i}" class="${i === state.active ? 'on' : ''}"><span>${esc(d.name)}</span><b>${fmt(drawerTotal(d))}</b></button>`).join('');
    $('allTotal').textContent = fmt(state.drawers.reduce((s, d) => s + drawerTotal(d), 0));
  }
  const openDrawers = () => { renderDrawerList(); $('drawersDlg').showModal(); };
  $('drawersBtn').addEventListener('click', openDrawers);
  $('drawerName').addEventListener('click', openDrawers);
  $('drawerList').addEventListener('click', ev => {
    const b = ev.target.closest('button[data-i]');
    if (b) { state.active = +b.dataset.i; $('drawersDlg').close(); render(); }
  });
  $('addDrawer').addEventListener('click', () => {
    state.drawers.push(newDrawer(state.drawers.length + 1));
    state.active = state.drawers.length - 1;
    $('drawersDlg').close(); render();
  });
  $('drawersDlg').addEventListener('click', ev => { if (ev.target.dataset && ev.target.dataset.a === 'close') $('drawersDlg').close(); });

  render();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
