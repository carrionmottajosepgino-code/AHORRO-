/* AHORRA+ — interfaz. Datos solo en este dispositivo (localStorage). */
(function () {
  'use strict';
  var E = window.Engine;
  var KEY = 'ahorramas.v1';
  var VERSION = '1.0.0';

  var TEMPLATES = {
    '503020': { label: '50 / 30 / 20', desc: 'Necesidades · Deseos · Ahorro', groups: [
      { id: 'nec', name: 'Necesidades', pct: 50, color: '#2563EB', spend: true },
      { id: 'des', name: 'Deseos', pct: 30, color: '#DB2777', spend: true },
      { id: 'aho', name: 'Ahorro', pct: 20, color: '#0D9488', spend: false }] },
    'tilbury': { label: '25 / 15 / 50 / 10', desc: '4 grupos con nombres editables', groups: [
      { id: 'nec', name: 'Necesidades', pct: 50, color: '#2563EB', spend: true },
      { id: 'aho', name: 'Ahorro', pct: 25, color: '#0D9488', spend: false },
      { id: 'des', name: 'Deseos', pct: 15, color: '#DB2777', spend: true },
      { id: 'lib', name: 'Grupo libre', pct: 10, color: '#64748B', spend: true }] }
  };
  var DEFAULT_CATS = [
    { id: 'mer', name: 'Mercado', g: 'nec' }, { id: 'tra', name: 'Transporte', g: 'nec' },
    { id: 'ser', name: 'Servicios', g: 'nec' }, { id: 'sal', name: 'Salud', g: 'nec' },
    { id: 'com', name: 'Comida fuera', g: 'des' }, { id: 'oci', name: 'Ocio', g: 'des' },
    { id: 'cpr', name: 'Compras', g: 'des' }, { id: 'sus', name: 'Suscripciones', g: 'des' }];

  // ---------- utilidades ----------
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  var M = E.money;
  function today() { return E.today(); }
  function centsToInput(c) { return c ? (c / 100).toFixed(2) : ''; }

  // ---------- estado ----------
  function freshState() {
    return { v: 1, onboarded: false,
      cfg: { mode: 'quincenal', days: [15, 31], amount: 0, adelantar: true, holidays: [] },
      ruleId: '503020', rule: clone(TEMPLATES['503020']), fixed: [], cats: clone(DEFAULT_CATS),
      incomes: [], expenses: [], envelopes: {}, paid: {}, notified: {}, lastBackup: null };
  }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var s = JSON.parse(raw); if (s && s.v === 1) return Object.assign(freshState(), s); }
    } catch (e) { /* sin almacenamiento disponible */ }
    return freshState();
  }
  var storageOk = true;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); storageOk = true; }
    catch (e) { storageOk = false; toast('No se pudo guardar en este dispositivo. Revisa el espacio o el modo incógnito.'); }
  }

  var S = load();
  var ui = {
    screen: S.onboarded ? 'home' : 'onboard', view: null, sheet: null, toast: '',
    amt: '', cat: null, note: '', date: null,
    ob: { step: 1, mode: 'quincenal', d1: 15, d2: 31, amount: '', adelantar: true, ruleId: '503020', fixed: [], fName: '', fAmt: '', fDay: '' },
    cfgDraft: null, ruleDraft: null, ruleIdDraft: null, newCat: { name: '', g: 'nec' }
  };

  // ---------- iconos ----------
  var I = {
    home: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    list: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
    plus: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    bell: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
    gear: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
    left: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
    right: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
    lock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    trash: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
    edit: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>'
  };

  // ---------- helpers de vista ----------
  function groupOf(id) { return S.rule.groups.filter(function (g) { return g.id === id; })[0]; }
  function catOf(id) { return S.cats.filter(function (c) { return c.id === id; })[0]; }
  function firstSpendGroup() { var g = S.rule.groups.filter(function (x) { return x.id === 'nec' && x.spend; })[0] || S.rule.groups.filter(function (x) { return x.spend; })[0]; return g ? g.id : 'nec'; }
  function periodWord() { return S.cfg.mode === 'mensual' ? 'este mes' : 'esta quincena'; }
  function sw(on, act, label) { return '<button type="button" class="switch" role="switch" aria-checked="' + (on ? 'true' : 'false') + '" aria-label="' + esc(label) + '" data-act="' + act + '"><span></span></button>'; }
  function dayOptions(sel, max, lastLabel) {
    var h = '';
    for (var d = 1; d <= max; d++) h += '<option value="' + d + '"' + (d === sel ? ' selected' : '') + '>' + (d === 31 && lastLabel ? 'Último día' : 'Día ' + d) + '</option>';
    return h;
  }
  function fillColor(g) {
    if (!g.spend) return g.color;
    if (g.status === 'over') return 'var(--danger)';
    if (g.status === 'fast') return 'var(--warn)';
    if (g.status === 'watch') return 'var(--watch)';
    return g.color;
  }

  // ---------- render ----------
  var lastScreen = null;
  function render() {
    var app = document.getElementById('app');
    var y = window.scrollY;
    var sameScreen = lastScreen === ui.screen;
    var focusId = document.activeElement && document.activeElement.id;
    app.innerHTML = view();
    lastScreen = ui.screen;
    window.scrollTo(0, sameScreen ? y : 0);
    if (focusId) { var f = document.getElementById(focusId); if (f && f.tagName === 'INPUT') { try { f.focus({ preventScroll: true }); } catch (e) { } } }
  }
  function view() {
    if (ui.screen === 'onboard') return onboardView() + toastView();
    var body = ui.screen === 'home' ? homeView() : ui.screen === 'add' ? addView() : ui.screen === 'alerts' ? alertsView()
      : ui.screen === 'moves' ? movesView() : settingsView();
    return '<main class="main">' + body + '</main>' + navView() + sheetView() + toastView();
  }
  function toastView() { return ui.toast ? '<div class="toast" role="status">' + esc(ui.toast) + '</div>' : ''; }
  var toastTimer = null;
  function toast(msg) {
    ui.toast = msg; render();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { ui.toast = ''; render(); }, 3200);
  }

  function navView() {
    var a = currentAlerts();
    function tab(id, label, icon, extra) {
      return '<button type="button" class="tab" data-act="go" data-arg="' + id + '"' + (ui.screen === id ? ' aria-current="page"' : '') + '>' + icon + (extra || '') + '<span>' + label + '</span></button>';
    }
    return '<nav class="tabs" aria-label="Principal"><div class="inner">' +
      tab('home', 'Inicio', I.home) + tab('moves', 'Movimientos', I.list) +
      '<button type="button" class="fab" data-act="go" data-arg="add" aria-label="Registrar gasto">' + I.plus + '</button>' +
      tab('alerts', 'Alertas', I.bell, a.important ? '<span class="badge" style="top:4px;right:calc(50% - 22px)">' + a.important + '</span>' : '') +
      tab('settings', 'Ajustes', I.gear) + '</div></nav>';
  }
  function currentAlerts() { var t = today(); return E.alerts(S, E.summarize(S, t), t); }

  // ---------- periodo visible ----------
  function viewDay() { return ui.view || today(); }
  function periodNav(sum) {
    var isCur = !ui.view;
    return '<div class="row">' +
      '<button type="button" class="icon-btn" data-act="prevPeriod" aria-label="Periodo anterior">' + I.left + '</button>' +
      '<button type="button" class="icon-btn" data-act="nextPeriod" aria-label="Periodo siguiente"' + (isCur ? ' disabled' : '') + '>' + I.right + '</button></div>';
  }

  // ---------- INICIO ----------
  function homeView() {
    var t = today(), day = viewDay(), isCur = !ui.view;
    var sum = E.summarize(S, day), per = sum.period;
    var h = '';
    h += '<div class="between"><div style="min-width:0"><div class="eyebrow">' + esc(per.range) + '</div><h1>' + esc(per.label) + '</h1></div>' + periodNav(sum) + '</div>';
    if (!isCur) h += '<button type="button" class="btn soft sm" data-act="viewToday">Estás viendo un periodo anterior · Volver a hoy</button>';
    var pct = isCur ? (per.dayIndex / per.days * 100) : 100;
    h += '<div class="stack" style="gap:6px"><div class="between small muted" style="font-weight:700"><span>' + (isCur ? 'Día ' + per.dayIndex + ' de ' + per.days : 'Periodo cerrado') +
      '</span><span>Próximo pago: ' + esc(E.withDow(per.next)) + '</span></div><div class="bar thin"><div class="fill" style="width:' + pct + '%;background:var(--text)"></div></div></div>';

    if (!sum.regular && isCur) {
      h += '<section class="card" style="background:var(--primary-soft)"><h2 style="color:var(--primary-soft-ink)">¿Ya recibiste tu pago del ' + esc(E.short(per.start)) + '?</h2>' +
        '<p style="font-size:14px;color:var(--primary-soft-ink)">Regístralo para distribuirlo con tu regla y apartar tus sobres. Así verás cuánto puedes gastar ' + periodWord() + '.</p>' +
        '<button type="button" class="btn" data-act="openIncome">Registrar pago</button></section>';
    }
    if (sum.incomes.length) {
      var C = 2 * Math.PI * 48, used = Math.min(1, sum.usedTotal);
      h += '<section class="card hero" aria-label="Resumen del periodo"><div class="ring"><svg width="112" height="112" viewBox="0 0 112 112" aria-hidden="true">' +
        '<circle cx="56" cy="56" r="48" fill="none" stroke="var(--track)" stroke-width="12"/>' +
        '<circle cx="56" cy="56" r="48" fill="none" stroke="' + (sum.available < 0 ? 'var(--danger)' : 'var(--primary)') + '" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + (C * used).toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 56 56)"/></svg>' +
        '<div class="ring-label"><span style="font-size:20px;font-weight:800">' + Math.round(sum.usedTotal * 100) + '%</span><span class="small muted" style="font-weight:700">gastado</span></div></div>' +
        '<div class="stack" style="gap:4px;min-width:0"><span class="muted" style="font-size:13px;font-weight:700">' + (isCur ? 'Disponible para gastar' : 'Te sobró') + '</span>' +
        '<span class="big"' + (sum.available < 0 ? ' style="color:var(--danger)"' : '') + '>' + M(sum.available) + '</span>' +
        '<span style="font-size:13px;color:var(--text-3);font-weight:600">' + (isCur ? (sum.available > 0 ? '≈ ' + M(sum.perDay) + ' por día · quedan ' + sum.daysLeft + ' días' : 'Sin margen: revisa tus grupos') : 'Al cierre del periodo') + '</span></div></section>';

      h += '<div class="between" style="margin-top:4px"><h2>Presupuesto por grupo</h2>' + (isCur ? '<span class="small muted row" style="font-weight:700;gap:6px"><span style="width:2px;height:12px;background:var(--text);border-radius:2px"></span>ritmo ideal hoy</span>' : '') + '</div>';
      sum.groups.forEach(function (g) {
        var w = g.spend ? Math.max(0, Math.min(100, g.used * 100)) : 100;
        var warn = g.status === 'over' ? '<span class="chip lv-danger">Excedido</span>' : g.status === 'fast' ? '<span class="chip lv-warn">Ritmo alto</span>' : '';
        h += '<section class="card" style="padding:14px 16px">' +
          '<div class="between"><div class="row" style="flex-wrap:wrap"><span class="dot" style="background:' + g.color + '"></span><h3>' + esc(g.name) + '</h3><span class="chip">' + g.pct + '%</span>' + warn + '</div>' +
          '<span class="small" style="font-weight:800;color:var(--text-3)">' + (g.spend ? Math.round(g.used * 100) + '% usado' : 'Ahorro') + '</span></div>' +
          '<div class="bar"><div class="fill" style="width:' + w + '%;background:' + fillColor(g) + '"></div>' +
          (g.spend && isCur ? '<div class="mark" style="left:calc(' + (sum.elapsed * 100) + '% - 1px)"></div>' : '') + '</div>' +
          '<div class="between small muted"><span>' + (g.spend ? (g.committed > 0 ? 'Sobres y fijos: ' + M(g.committed) : 'Asignado ' + M(g.asig)) : 'Transfiérelo a tu cuenta de ahorro') + '</span>' +
          '<span style="font-weight:800;color:var(--text);white-space:nowrap">' + (g.spend ? M(g.spent) + ' de ' + M(g.libre) : M(g.asig)) + '</span></div></section>';
      });
    }

    // sobres
    h += '<section class="card" aria-labelledby="sobres-t"><div class="between"><h2 id="sobres-t">Sobres de gastos fijos</h2><span class="small muted" style="font-weight:700">Reservado ' + M(sum.reserved) + '</span></div>';
    if (!sum.envelopes.length) {
      h += '<p class="muted" style="font-size:14px">Agrega tu alquiler, servicios y otros gastos fijos para que la app aparte su parte en cada pago.</p><button type="button" class="btn ghost sm" data-act="go" data-arg="settings">Agregar gastos fijos</button>';
    }
    sum.envelopes.forEach(function (e) {
      var w = Math.min(100, e.amount ? e.balance / e.amount * 100 : 0);
      var dueTxt = e.paid ? 'Pagado' : (e.daysTo < 0 ? 'Venció el ' + E.short(e.due) : 'Vence ' + E.withDow(e.due));
      h += '<div class="stack" style="gap:8px;padding:6px 0"><div class="between"><div class="row"><span class="env-icon">' + I.lock + '</span><div class="stack" style="gap:2px"><strong style="font-size:15px">' + esc(e.name) + '</strong><span class="small muted">' + esc(dueTxt) + ' · ' + M(e.amount) + '</span></div></div>' +
        (e.paid ? '<span class="chip lv-good">Pagado</span>' : (isCur ? '<button type="button" class="btn ghost sm" data-act="openPay" data-arg="' + esc(e.key) + '">Pagar</button>' : '')) + '</div>' +
        (e.paid ? '' : '<div class="bar thin" style="background:var(--env-soft)"><div class="fill" style="width:' + w + '%;background:var(--env)"></div></div><span class="small" style="font-weight:700;color:var(--text-3)">' + M(e.balance) + ' de ' + M(e.amount) + (e.complete ? ' · sobre completo' : '') + '</span>') + '</div>';
    });
    h += '</section>';

    // últimos movimientos
    var moves = movesOf(sum).slice(0, 5);
    h += '<section class="card"><div class="between"><h2>Últimos movimientos</h2><button type="button" class="btn ghost sm" data-act="go" data-arg="moves">Ver todos</button></div>' +
      (moves.length ? moves.map(moveRow.bind(null, false)).join('') : '<p class="empty">Aún no hay movimientos en este periodo.</p>') + '</section>';
    if (isCur && sum.regular) h += '<button type="button" class="btn ghost block" data-act="openExtra">Registrar ingreso extra</button>';
    return h;
  }

  function movesOf(sum) {
    var list = [];
    sum.expenses.forEach(function (e) { list.push({ type: 'exp', date: e.date, item: e }); });
    sum.incomes.forEach(function (i) { list.push({ type: 'inc', date: i.date, item: i }); });
    return list.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (b.item.id > a.item.id ? 1 : -1); });
  }
  function moveRow(withDelete, m) {
    var title, sub, amt;
    if (m.type === 'inc') {
      title = m.item.kind === 'regular' ? 'Pago del periodo' : 'Ingreso extra';
      sub = E.withDow(m.item.date) + (m.item.kind === 'extra' && m.item.allToSavings ? ' · todo a ahorro' : ' · distribuido');
      amt = '<span class="amount-pos" style="font-weight:800">+' + M(m.item.amount) + '</span>';
    } else {
      var c = catOf(m.item.cat), g = c ? groupOf(c.g) : null;
      title = m.item.envelope ? 'Pago: ' + m.item.note : (c ? c.name : 'Sin categoría');
      sub = E.withDow(m.item.date) + (m.item.envelope ? ' · desde sobre' : (g ? ' · ' + g.name : '')) + (m.item.note && !m.item.envelope ? ' · ' + m.item.note : '');
      amt = '<span style="font-weight:800">' + M(-m.item.amount) + '</span>';
    }
    return '<div class="list-item"><div class="stack" style="gap:2px;min-width:0"><strong style="font-size:14px">' + esc(title) + '</strong><span class="small muted">' + esc(sub) + '</span></div>' +
      '<div class="row">' + amt + (withDelete ? '<button type="button" class="icon-btn" data-act="askDelete" data-arg="' + m.type + ':' + esc(m.item.id) + '" aria-label="Eliminar movimiento">' + I.trash + '</button>' : '') + '</div></div>';
  }

  // ---------- MOVIMIENTOS ----------
  function movesView() {
    var sum = E.summarize(S, viewDay()), per = sum.period;
    var moves = movesOf(sum);
    var spent = sum.expenses.reduce(function (a, e) { return a + e.amount; }, 0);
    var inc = sum.incomes.reduce(function (a, i) { return a + i.amount; }, 0);
    return '<div class="between"><div style="min-width:0"><div class="eyebrow">' + esc(per.range) + '</div><h1>Movimientos</h1></div>' + periodNav(sum) + '</div>' +
      '<p class="muted" style="font-size:14px">' + esc(per.label) + '</p>' +
      '<div class="grid2"><div class="card" style="gap:2px"><span class="small muted" style="font-weight:700">Ingresos</span><strong class="amount-pos" style="font-size:18px">' + M(inc) + '</strong></div>' +
      '<div class="card" style="gap:2px"><span class="small muted" style="font-weight:700">Gastos</span><strong style="font-size:18px">' + M(spent) + '</strong></div></div>' +
      '<section class="card">' + (moves.length ? moves.map(moveRow.bind(null, true)).join('') : '<p class="empty">Sin movimientos en este periodo.</p>') + '</section>';
  }

  // ---------- REGISTRAR GASTO ----------
  function addView() {
    var sum = E.summarize(S, today());
    var amtC = E.toCents(ui.amt);
    var c = catOf(ui.cat), g = c ? sum.groups.filter(function (x) { return x.id === c.g; })[0] : null;
    var hint = !sum.regular ? 'Aún no registras tu pago de este periodo.' : (g ? 'Va a ' + g.name + ' · te quedan ' + M(g.remaining - amtC) + ' ' + periodWord() : 'Elige una categoría');
    var counts = {};
    S.expenses.forEach(function (e) { counts[e.cat] = (counts[e.cat] || 0) + 1; });
    var cats = S.cats.slice().sort(function (a, b) { return (counts[b.id] || 0) - (counts[a.id] || 0); });
    var h = '<div class="between"><h1>Nuevo gasto</h1><button type="button" class="btn ghost sm" data-act="cancelAdd">Cancelar</button></div>';
    h += '<section class="card" style="align-items:center;border-radius:22px;gap:4px"><span class="muted" style="font-size:13px;font-weight:700">Monto</span>' +
      '<span style="font-size:40px;font-weight:800;letter-spacing:-.02em" aria-live="polite">S/ ' + esc(ui.amt || '0') + '</span>' +
      '<span class="small" style="font-weight:700;color:var(--text-3);text-align:center">' + esc(hint) + '</span></section>';
    h += '<div class="grid4" role="group" aria-label="Categoría">' + cats.map(function (k) {
      var gg = groupOf(k.g);
      return '<button type="button" class="cat" data-act="pickCat" data-arg="' + esc(k.id) + '" aria-pressed="' + (ui.cat === k.id ? 'true' : 'false') + '"><span class="dot" style="background:' + (gg ? gg.color : '#888') + '"></span><span>' + esc(k.name) + '</span></button>';
    }).join('') + '</div>';
    h += '<div class="grid2"><label class="field">Nota (opcional)<input class="input" id="expNote" data-bind="note" value="' + esc(ui.note) + '" maxlength="60" autocomplete="off"></label>' +
      '<label class="field">Fecha<input class="input" type="date" id="expDate" data-bind="date" value="' + esc(ui.date || today()) + '"></label></div>';
    var keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];
    h += '<div class="grid3">' + keys.map(function (k) {
      return '<button type="button" class="key" data-act="key" data-arg="' + k + '" aria-label="' + (k === 'del' ? 'Borrar' : k === '.' ? 'Punto decimal' : k) + '">' + (k === 'del' ? '⌫' : k) + '</button>';
    }).join('') + '</div>';
    h += '<button type="button" class="btn block" data-act="saveExpense"' + (amtC > 0 && c ? '' : ' disabled') + '>Guardar gasto</button>';
    return h;
  }

  // ---------- ALERTAS ----------
  function alertsView() {
    var a = currentAlerts();
    var h = '<div class="stack" style="gap:2px"><h1>Alertas</h1><span class="muted" style="font-size:13px">' + esc(E.summarize(S, today()).period.label) + '</span></div>';
    a.list.forEach(function (x) {
      var btn = x.action === 'income' ? '<button type="button" class="btn sm" data-act="openIncome">Registrar pago</button>'
        : x.action === 'envelopes' ? '<button type="button" class="btn ghost sm" data-act="go" data-arg="home">Ver sobres</button>'
          : x.action === 'backup' ? '<button type="button" class="btn ghost sm" data-act="go" data-arg="settings">Ir a respaldo</button>' : '';
      h += '<section class="card"><span class="tag lv-' + x.level + '">' + esc(x.tag) + '</span><h3>' + esc(x.title) + '</h3><p style="font-size:14px;color:var(--text-3);line-height:1.45">' + esc(x.body) + '</p>' + (btn ? '<div>' + btn + '</div>' : '') + '</section>';
    });
    var perm = ('Notification' in window) ? Notification.permission : 'unsupported';
    h += '<section class="card"><h3>Notificaciones del sistema</h3><p class="muted" style="font-size:14px;line-height:1.45">' +
      (perm === 'granted' ? 'Activadas. Te avisaremos al abrir la app o al registrar un gasto si algún grupo va muy rápido o se acerca un vencimiento.'
        : perm === 'denied' ? 'Bloqueadas en este navegador. Puedes permitirlas desde la configuración del sitio.'
          : perm === 'unsupported' ? (isNative ? 'En esta versión de la app, las alertas se muestran aquí y en el contador de la campana.' : 'Este navegador no permite notificaciones. Las alertas seguirán apareciendo aquí.')
            : 'Recibe avisos de ritmo de gasto y vencimientos. Funcionan sin internet, al abrir la app o registrar un gasto.') + '</p>' +
      (perm === 'default' ? '<div><button type="button" class="btn sm" data-act="enableNotif">Activar notificaciones</button></div>' : '') + '</section>';
    return h;
  }

  // ---------- AJUSTES ----------
  function settingsView() {
    if (!ui.cfgDraft) ui.cfgDraft = clone(S.cfg);
    if (!ui.ruleDraft) { ui.ruleDraft = clone(S.rule); ui.ruleIdDraft = S.ruleId; }
    var c = ui.cfgDraft, h = '<h1>Ajustes</h1>';
    // ingresos
    h += '<section class="card" aria-labelledby="s-inc"><h2 id="s-inc">Ingresos</h2>' +
      '<label class="field">Frecuencia<select class="input" data-bind="cfgDraft.mode" data-rerender="1"><option value="quincenal"' + (c.mode === 'quincenal' ? ' selected' : '') + '>Quincenal (dos pagos al mes)</option><option value="mensual"' + (c.mode === 'mensual' ? ' selected' : '') + '>Mensual (un pago al mes)</option></select></label>';
    if (c.mode === 'quincenal') {
      h += '<div class="grid2"><label class="field">Primer pago<select class="input" data-bind="cfgDraft.days.0" data-num="1">' + dayOptions(c.days[0], 28) + '</select></label>' +
        '<label class="field">Segundo pago<select class="input" data-bind="cfgDraft.days.1" data-num="1">' + dayOptions(c.days[1] || 31, 31, true) + '</select></label></div>';
    } else {
      h += '<label class="field">Día de pago<select class="input" data-bind="cfgDraft.days.0" data-num="1">' + dayOptions(c.days[c.days.length - 1], 31, true) + '</select></label>';
    }
    h += '<label class="field">Monto neto por pago (S/)<input class="input" id="cfgAmt" inputmode="decimal" data-bind="cfgDraft.amountText" value="' + esc(c.amountText != null ? c.amountText : centsToInput(c.amount)) + '"></label>' +
      '<div class="between"><div class="stack" style="gap:2px"><strong style="font-size:14px">Adelantar si cae fin de semana o feriado</strong><span class="small muted">Se paga el día hábil anterior</span></div>' + sw(c.adelantar, 'toggleCfgAdelantar', 'Adelantar pagos') + '</div>' +
      '<label class="field">Feriados (uno por línea, AAAA-MM-DD)<textarea class="input" id="cfgHol" data-bind="cfgDraft.holText" placeholder="2026-12-08&#10;2026-12-25">' + esc(c.holText != null ? c.holText : (c.holidays || []).join('\n')) + '</textarea></label>' +
      '<p class="small muted">Próximos pagos: ' + esc(nextPays(c).join(' · ')) + '</p>' +
      '<button type="button" class="btn" data-act="saveCfg">Guardar ingresos</button></section>';
    // regla
    var r = ui.ruleDraft, sumPct = r.groups.reduce(function (a, g) { return a + (+g.pct || 0); }, 0);
    h += '<section class="card" aria-labelledby="s-rule"><h2 id="s-rule">Regla de distribución</h2><div class="grid2">' +
      Object.keys(TEMPLATES).map(function (id) {
        return '<button type="button" class="option" data-act="ruleTpl" data-arg="' + id + '" aria-pressed="' + (ui.ruleIdDraft === id ? 'true' : 'false') + '"><strong>' + TEMPLATES[id].label + '</strong><span class="small muted">' + TEMPLATES[id].desc + '</span></button>';
      }).join('') + '</div>' +
      r.groups.map(function (g, i) {
        return '<div class="row"><span class="dot" style="background:' + g.color + '"></span><input class="input" style="flex:1" aria-label="Nombre del grupo" id="rg' + i + 'n" data-bind="ruleDraft.groups.' + i + '.name" value="' + esc(g.name) + '" maxlength="24">' +
          '<input class="input" style="width:84px" inputmode="numeric" aria-label="Porcentaje de ' + esc(g.name) + '" id="rg' + i + 'p" data-bind="ruleDraft.groups.' + i + '.pct" data-num="1" data-rerender-blur="1" value="' + esc(g.pct) + '"><span class="muted">%</span></div>';
      }).join('') +
      '<p class="small" style="font-weight:700;color:' + (sumPct === 100 ? 'var(--good-ink)' : 'var(--danger-ink)') + '">Total: ' + sumPct + '%' + (sumPct === 100 ? '' : ' · debe sumar 100%') + '</p>' +
      '<p class="small muted">Los cambios se aplican a los próximos ingresos que registres.</p>' +
      '<button type="button" class="btn" data-act="saveRule">Guardar regla</button></section>';
    // fijos
    h += '<section class="card" aria-labelledby="s-fx"><div class="between"><h2 id="s-fx">Gastos fijos</h2><button type="button" class="btn soft sm" data-act="newFixed">Agregar</button></div>' +
      (S.fixed.length ? S.fixed.map(function (f) {
        return '<div class="list-item"><div class="stack" style="gap:2px"><strong style="font-size:14px">' + esc(f.name) + '</strong><span class="small muted">' + M(f.amount) + ' · vence el día ' + f.day + '</span></div>' +
          '<button type="button" class="icon-btn" data-act="editFixed" data-arg="' + esc(f.id) + '" aria-label="Editar ' + esc(f.name) + '">' + I.edit + '</button></div>';
      }).join('') : '<p class="muted" style="font-size:14px">Sin gastos fijos. Agrega el alquiler, servicios, cuotas…</p>') + '</section>';
    // categorías
    var spendGroups = S.rule.groups.filter(function (g) { return g.spend; });
    h += '<section class="card" aria-labelledby="s-cat"><h2 id="s-cat">Categorías</h2>' +
      S.cats.map(function (k) {
        return '<div class="list-item"><strong style="font-size:14px;flex:1">' + esc(k.name) + '</strong>' +
          '<select class="input" style="width:150px" aria-label="Grupo de ' + esc(k.name) + '" data-catgroup="' + esc(k.id) + '">' +
          spendGroups.map(function (g) { return '<option value="' + g.id + '"' + (k.g === g.id ? ' selected' : '') + '>' + esc(g.name) + '</option>'; }).join('') + '</select>' +
          '<button type="button" class="icon-btn" data-act="delCat" data-arg="' + esc(k.id) + '" aria-label="Eliminar ' + esc(k.name) + '">' + I.trash + '</button></div>';
      }).join('') +
      '<div class="row"><input class="input" style="flex:1" id="newCatName" placeholder="Nueva categoría" aria-label="Nombre de la nueva categoría" data-bind="newCat.name" value="' + esc(ui.newCat.name) + '" maxlength="20">' +
      '<select class="input" style="width:130px" aria-label="Grupo" data-bind="newCat.g">' + spendGroups.map(function (g) { return '<option value="' + g.id + '"' + (ui.newCat.g === g.id ? ' selected' : '') + '>' + esc(g.name) + '</option>'; }).join('') + '</select></div>' +
      '<button type="button" class="btn soft" data-act="addCat">Agregar categoría</button></section>';
    // respaldo
    h += '<section class="card" aria-labelledby="s-bk" id="backup"><h2 id="s-bk">Respaldo</h2><p class="muted" style="font-size:14px;line-height:1.45">Tus datos se guardan solo en este celular. Exporta una copia de vez en cuando y guárdala en un lugar seguro.' +
      (S.lastBackup ? ' Último respaldo: ' + esc(E.withDow(S.lastBackup)) + '.' : '') + '</p>' +
      '<div class="grid2"><button type="button" class="btn" data-act="exportData">Exportar</button>' +
      '<label class="btn ghost" style="display:flex;align-items:center;justify-content:center">Importar<input type="file" id="importFile" accept="application/json,.json" class="sr-only"></label></div>' +
      '<button type="button" class="btn ghost" style="color:var(--danger)" data-act="askReset">Borrar todos los datos</button></section>';
    h += '<p class="small muted" style="text-align:center">AHORRA+ ' + VERSION + ' · funciona sin internet' + (storageOk ? '' : ' · ⚠ no se está guardando') + '</p>';
    return h;
  }
  function nextPays(cfg) {
    var t = today();
    var dates = E.payDatesBetween(t, E.addDays(t, cfg.mode === 'mensual' ? 100 : 62), normalizeCfg(cfg));
    return dates.slice(0, 4).map(E.withDow);
  }
  function normalizeCfg(c) {
    var days = c.mode === 'mensual' ? [c.days[c.days.length - 1] || 31] : [c.days[0] || 15, c.days[1] || 31];
    return { mode: c.mode, days: days, adelantar: c.adelantar, holidays: c.holidays || [] };
  }

  // ---------- CONFIGURACIÓN INICIAL ----------
  function onboardView() {
    var o = ui.ob, h = '<main class="main" style="padding-bottom:32px">';
    h += '<div class="steps" aria-hidden="true">' + [1, 2, 3, 4].map(function (i) { return '<span class="' + (i <= o.step ? 'on' : '') + '"></span>'; }).join('') + '</div>';
    h += '<span class="eyebrow">Paso ' + o.step + ' de 4</span>';
    var cfg = { mode: o.mode, days: o.mode === 'mensual' ? [o.d2] : [o.d1, o.d2], adelantar: o.adelantar, holidays: [] };
    if (o.step === 1) {
      h += '<h1>¿Cómo te pagan?</h1><p class="muted">Tu presupuesto se organizará por periodos de pago, no por mes calendario.</p>' +
        '<div class="grid2"><button type="button" class="option" data-act="obMode" data-arg="quincenal" aria-pressed="' + (o.mode === 'quincenal') + '"><strong>Quincenal</strong><span class="small muted">Dos pagos al mes</span></button>' +
        '<button type="button" class="option" data-act="obMode" data-arg="mensual" aria-pressed="' + (o.mode === 'mensual') + '"><strong>Mensual</strong><span class="small muted">Un pago al mes</span></button></div>';
      if (o.mode === 'quincenal') {
        h += '<div class="grid2"><label class="field">Primer pago<select class="input" data-bind="ob.d1" data-num="1" data-rerender="1">' + dayOptions(o.d1, 28) + '</select></label>' +
          '<label class="field">Segundo pago<select class="input" data-bind="ob.d2" data-num="1" data-rerender="1">' + dayOptions(o.d2, 31, true) + '</select></label></div>';
      } else {
        h += '<label class="field">Día de pago<select class="input" data-bind="ob.d2" data-num="1" data-rerender="1">' + dayOptions(o.d2, 31, true) + '</select></label>';
      }
      h += '<div class="card" style="flex-direction:row;justify-content:space-between;align-items:center"><div class="stack" style="gap:2px"><strong style="font-size:14px">Adelantar si cae fin de semana</strong><span class="small muted">Se paga el día hábil anterior</span></div>' + sw(o.adelantar, 'obAdelantar', 'Adelantar pagos') + '</div>';
      h += '<section class="card"><h3>Tus próximos pagos</h3>' + nextPays(cfg).map(function (d) { return '<div class="list-item"><strong style="font-size:14px">' + esc(d) + '</strong></div>'; }).join('') + '</section>';
    } else if (o.step === 2) {
      h += '<h1>¿Cuánto recibes en cada pago?</h1><p class="muted">Monto neto, después de descuentos. Si varía, pon un promedio: al registrar cada pago podrás ajustarlo.</p>' +
        '<label class="field">Monto por pago (S/)<input class="input" id="obAmt" inputmode="decimal" placeholder="2500.00" data-bind="ob.amount" value="' + esc(o.amount) + '" style="font-size:22px;font-weight:800;min-height:56px"></label>';
    } else if (o.step === 3) {
      var amt = E.toCents(o.amount);
      h += '<h1>Elige tu regla de distribución</h1><p class="muted">Cada pago se repartirá automáticamente. Podrás cambiar nombres y porcentajes en Ajustes.</p><div class="stack">' +
        Object.keys(TEMPLATES).map(function (id) {
          var tpl = TEMPLATES[id], split = E.splitByRule(amt, tpl.groups);
          return '<button type="button" class="option" data-act="obRule" data-arg="' + id + '" aria-pressed="' + (o.ruleId === id) + '"><strong style="font-size:16px">' + tpl.label + '</strong>' +
            '<span class="small muted">' + tpl.groups.map(function (g) { return g.name + ' ' + M(split[g.id]); }).join(' · ') + '</span></button>';
        }).join('') + '</div>';
    } else {
      h += '<h1>Tus gastos fijos</h1><p class="muted">Alquiler, servicios, cuotas… La app apartará una parte en cada pago para que nunca te golpeen de golpe.</p>';
      h += '<section class="card">' + (o.fixed.length ? o.fixed.map(function (f, i) {
        return '<div class="list-item"><div class="stack" style="gap:2px"><strong style="font-size:14px">' + esc(f.name) + '</strong><span class="small muted">' + M(f.amount) + ' · día ' + f.day + '</span></div><button type="button" class="icon-btn" data-act="obDelFixed" data-arg="' + i + '" aria-label="Quitar ' + esc(f.name) + '">' + I.trash + '</button></div>';
      }).join('') : '<p class="muted" style="font-size:14px">Aún no agregas ninguno. Puedes hacerlo luego en Ajustes.</p>') + '</section>';
      h += '<section class="card"><label class="field">Nombre<input class="input" id="obFName" data-bind="ob.fName" value="' + esc(o.fName) + '" placeholder="Alquiler" maxlength="30"></label>' +
        '<div class="grid2"><label class="field">Monto (S/)<input class="input" id="obFAmt" inputmode="decimal" data-bind="ob.fAmt" value="' + esc(o.fAmt) + '" placeholder="1200"></label>' +
        '<label class="field">Vence el día<input class="input" id="obFDay" inputmode="numeric" data-bind="ob.fDay" value="' + esc(o.fDay) + '" placeholder="1"></label></div>' +
        '<button type="button" class="btn soft" data-act="obAddFixed">Agregar gasto fijo</button></section>';
    }
    h += '<div class="grid2" style="margin-top:6px">' + (o.step > 1 ? '<button type="button" class="btn ghost" data-act="obBack">Atrás</button>' : '<span></span>') +
      '<button type="button" class="btn" data-act="obNext">' + (o.step === 4 ? 'Empezar' : 'Siguiente') + '</button></div>';
    return h + '</main>';
  }

  // ---------- HOJAS ----------
  function sheetView() {
    var s = ui.sheet;
    if (!s) return '';
    var inner = '';
    var per = E.summarize(S, today()).period;
    if (s.type === 'income' || s.type === 'extra') {
      var extra = s.type === 'extra';
      inner = '<h2>' + (extra ? 'Ingreso extra' : 'Registrar pago del ' + esc(E.short(per.start))) + '</h2>' +
        '<label class="field">Monto recibido (S/)<input class="input" id="incAmt" inputmode="decimal" data-bind="sheet.amt" data-preview="1" value="' + esc(s.amt) + '" style="font-size:20px;font-weight:800"></label>' +
        '<label class="field">Fecha<input class="input" type="date" id="incDate" data-bind="sheet.date" value="' + esc(s.date) + '"></label>';
      if (extra) inner += '<div class="grid2"><button type="button" class="option" data-act="extraMode" data-arg="rule" aria-pressed="' + (!s.allSav) + '"><strong>Con mi regla</strong><span class="small muted">Se reparte en grupos</span></button>' +
        '<button type="button" class="option" data-act="extraMode" data-arg="sav" aria-pressed="' + (!!s.allSav) + '"><strong>Todo a ahorro</strong><span class="small muted">No suma al gasto</span></button></div>';
      inner += '<div id="incPreview">' + planHTML(s) + '</div>' +
        '<div class="grid2"><button type="button" class="btn ghost" data-act="closeSheet">Ahora no</button><button type="button" class="btn" data-act="saveIncome">Confirmar</button></div>';
    } else if (s.type === 'pay') {
      var env = E.summarize(S, today()).envelopes.filter(function (e) { return e.key === s.key; })[0];
      if (!env) { ui.sheet = null; return ''; }
      inner = '<h2>Pagar ' + esc(env.name) + '</h2><p class="muted" style="font-size:14px">En el sobre hay ' + M(env.balance) + ' de ' + M(env.amount) + '.</p>' +
        '<label class="field">Monto pagado (S/)<input class="input" id="payAmt" inputmode="decimal" data-bind="sheet.amt" data-preview="1" value="' + esc(s.amt) + '"></label>' +
        '<div id="incPreview">' + payHTML(s) + '</div>' +
        '<div class="grid2"><button type="button" class="btn ghost" data-act="closeSheet">Cancelar</button><button type="button" class="btn" data-act="savePay">Marcar pagado</button></div>';
    } else if (s.type === 'fixed') {
      inner = '<h2>' + (s.id ? 'Editar gasto fijo' : 'Nuevo gasto fijo') + '</h2>' +
        '<label class="field">Nombre<input class="input" id="fxName" data-bind="sheet.name" value="' + esc(s.name) + '" maxlength="30" placeholder="Alquiler"></label>' +
        '<div class="grid2"><label class="field">Monto (S/)<input class="input" id="fxAmt" inputmode="decimal" data-bind="sheet.amt" value="' + esc(s.amt) + '"></label>' +
        '<label class="field">Vence el día<input class="input" id="fxDay" inputmode="numeric" data-bind="sheet.day" value="' + esc(s.day) + '"></label></div>' +
        '<p class="small muted">Si el día no existe en el mes (ej. 31 en noviembre), vence el último día.</p>' +
        '<div class="grid2">' + (s.id ? '<button type="button" class="btn ghost" style="color:var(--danger)" data-act="delFixed">Eliminar</button>' : '<button type="button" class="btn ghost" data-act="closeSheet">Cancelar</button>') +
        '<button type="button" class="btn" data-act="saveFixed">Guardar</button></div>';
    } else if (s.type === 'confirm') {
      inner = '<h2>' + esc(s.title) + '</h2><p class="muted" style="font-size:14px;line-height:1.45">' + esc(s.body) + '</p>' +
        '<div class="grid2"><button type="button" class="btn ghost" data-act="closeSheet">Cancelar</button><button type="button" class="btn ' + (s.danger ? 'danger' : '') + '" data-act="confirmYes">' + esc(s.yes) + '</button></div>';
    }
    return '<div class="sheet-wrap" data-act="scrim"><div class="sheet" role="dialog" aria-modal="true" data-stop="1"><div class="grabber"></div>' + inner + '</div></div>';
  }
  function payHTML(s) {
    var env = E.summarize(S, today()).envelopes.filter(function (e) { return e.key === s.key; })[0];
    if (!env) return '';
    var c = E.toCents(s.amt), short = Math.max(0, c - env.balance);
    if (!c) return '<p class="small muted">Escribe el monto pagado.</p>';
    return '<p class="small" style="font-weight:700;color:' + (short ? 'var(--warn-ink)' : 'var(--good-ink)') + '">' +
      (short ? 'La diferencia de ' + M(short) + ' se descontará de ' + esc(groupOf(firstSpendGroup()).name) + '.' : 'Se paga completo desde el sobre.') + '</p>';
  }
  function planHTML(s) {
    var amt = E.toCents(s.amt);
    if (!amt) return '<p class="small muted">Escribe el monto para ver cómo se reparte.</p>';
    var per = E.summarize(S, today()).period;
    var plan = E.planIncome(amt, per.start, S, { extra: s.type === 'extra', allToSavings: s.type === 'extra' && s.allSav });
    var rows = '';
    plan.reserves.forEach(function (r) {
      rows += row('Sobre: ' + r.name, r.step > 1 ? 'Reserva · faltan ' + r.step + ' pagos antes del ' + E.short(r.due) : 'Completa el sobre · vence ' + E.short(r.due), r.amount);
    });
    S.rule.groups.forEach(function (g) {
      var v = plan.alloc[g.id] - plan.committed[g.id];
      if (!plan.alloc[g.id] && !plan.committed[g.id]) return;
      rows += g.spend ? row('Libre en ' + g.name, g.pct + '% del pago' + (plan.committed[g.id] ? ' menos sobres' : ''), v) : row(g.name, 'Transfiérelo a tu ahorro', v);
    });
    function row(a, b, c) { return '<div class="list-item"><div class="stack" style="gap:2px"><strong style="font-size:14px">' + esc(a) + '</strong><span class="small muted">' + esc(b) + '</span></div><strong style="font-size:14px' + (c < 0 ? ';color:var(--danger)' : '') + '">' + M(c) + '</strong></div>'; }
    return '<div class="card" style="padding:4px 14px;background:var(--surface-2);box-shadow:none;gap:0">' + rows + '</div>' +
      (plan.overflow ? '<p class="small" style="font-weight:700;color:var(--warn-ink);margin-top:8px">Tus sobres superan lo asignado a Necesidades; se tomó de otros grupos (nunca del ahorro).</p>' : '');
  }

  // ---------- acciones ----------
  function openConfirm(o) { ui.sheet = Object.assign({ type: 'confirm' }, o); render(); }
  var pendingConfirm = null;

  var actions = {
    go: function (arg) { ui.screen = arg; ui.sheet = null; if (arg !== 'settings') { ui.cfgDraft = null; ui.ruleDraft = null; } if (arg === 'add') { ui.amt = ''; ui.cat = null; ui.note = ''; ui.date = null; } render(); },
    cancelAdd: function () { ui.screen = 'home'; render(); },
    scrim: function (arg, el, ev) { if (ev.target === el) { ui.sheet = null; render(); } },
    closeSheet: function () { ui.sheet = null; render(); },
    prevPeriod: function () { var per = E.periodFor(viewDay(), S.cfg); ui.view = E.addDays(per.start, -1); render(); },
    nextPeriod: function () {
      var per = E.periodFor(viewDay(), S.cfg); var cur = E.periodFor(today(), S.cfg);
      ui.view = per.next >= cur.start ? null : E.addDays(E.periodFor(per.next, S.cfg).next, -1); render();
    },
    viewToday: function () { ui.view = null; render(); },
    key: function (k) {
      var a = ui.amt;
      if (k === 'del') a = a.slice(0, -1);
      else if (k === '.') { if (a.indexOf('.') === -1) a = (a || '0') + '.'; }
      else {
        var dot = a.indexOf('.');
        if (dot !== -1 && a.length - dot > 2) return;
        if (a.replace('.', '').length >= 7) return;
        a = a === '0' ? k : a + k;
      }
      ui.amt = a; render();
    },
    pickCat: function (id) { ui.cat = id; render(); },
    saveExpense: function () {
      var c = E.toCents(ui.amt), cat = catOf(ui.cat);
      if (!c || !cat) return toast('Ingresa un monto y elige una categoría.');
      var date = ui.date || today();
      S.expenses.push({ id: uid(), date: date, amount: c, cat: cat.id, note: (ui.note || '').trim() });
      save();
      var sum = E.summarize(S, today()), g = sum.groups.filter(function (x) { return x.id === cat.g; })[0];
      ui.screen = 'home'; ui.amt = ''; ui.cat = null; ui.note = ''; ui.date = null;
      toast(g && sum.regular ? 'Gasto guardado. Te quedan ' + M(g.remaining) + ' en ' + g.name + ' ' + periodWord() + '.' : 'Gasto guardado.');
      maybeNotify();
    },
    openIncome: function () {
      var per = E.summarize(S, today()).period;
      ui.screen = ui.screen === 'alerts' ? 'home' : ui.screen;
      ui.sheet = { type: 'income', amt: centsToInput(S.cfg.amount), date: today() < per.start ? per.start : today() }; render();
    },
    openExtra: function () { ui.sheet = { type: 'extra', amt: '', date: today(), allSav: false }; render(); },
    extraMode: function (m) { ui.sheet.allSav = m === 'sav'; render(); },
    saveIncome: function () {
      var s = ui.sheet, amt = E.toCents(s.amt);
      if (!amt) return toast('Escribe el monto recibido.');
      var per = E.summarize(S, today()).period;
      var extra = s.type === 'extra';
      var plan = E.planIncome(amt, per.start, S, { extra: extra, allToSavings: extra && s.allSav });
      plan.reserves.forEach(function (r) { S.envelopes[r.key] = (S.envelopes[r.key] || 0) + r.amount; });
      S.incomes.push({ id: uid(), kind: extra ? 'extra' : 'regular', date: s.date || today(), period: per.start, amount: amt,
        alloc: plan.alloc, committed: plan.committed, reserves: plan.reserves.map(function (r) { return { key: r.key, amount: r.amount, name: r.name }; }), allToSavings: !!(extra && s.allSav) });
      save(); ui.sheet = null;
      toast(extra ? 'Ingreso extra registrado.' : (plan.reserves.length ? 'Pago distribuido. Apartaste ' + M(plan.reserves.reduce(function (a, r) { return a + r.amount; }, 0)) + ' en tus sobres.' : 'Pago distribuido.'));
      maybeNotify();
    },
    openPay: function (key) {
      var env = E.summarize(S, today()).envelopes.filter(function (e) { return e.key === key; })[0];
      if (!env) return;
      ui.sheet = { type: 'pay', key: key, amt: centsToInput(env.amount) }; render();
    },
    savePay: function () {
      var s = ui.sheet, c = E.toCents(s.amt);
      var env = E.summarize(S, today()).envelopes.filter(function (e) { return e.key === s.key; })[0];
      if (!env || !c) return toast('Escribe el monto pagado.');
      var short = Math.max(0, c - env.balance);
      S.expenses.push({ id: uid(), date: today(), amount: c, cat: null, envelope: true, fixedKey: s.key, note: env.name, shortfall: short, shortfallGroup: short ? firstSpendGroup() : null });
      S.paid[s.key] = true; save(); ui.sheet = null;
      toast(env.name + ' pagado.' + (short ? ' ' + M(short) + ' salieron de ' + groupOf(firstSpendGroup()).name + '.' : ''));
    },
    askDelete: function (arg) {
      var p = arg.split(':'), type = p[0], id = p.slice(1).join(':');
      pendingConfirm = function () {
        if (type === 'exp') {
          var e = S.expenses.filter(function (x) { return x.id === id; })[0];
          if (e && e.envelope) delete S.paid[e.fixedKey];
          S.expenses = S.expenses.filter(function (x) { return x.id !== id; });
        } else {
          var inc = S.incomes.filter(function (x) { return x.id === id; })[0];
          if (inc) (inc.reserves || []).forEach(function (r) { S.envelopes[r.key] = Math.max(0, (S.envelopes[r.key] || 0) - r.amount); });
          S.incomes = S.incomes.filter(function (x) { return x.id !== id; });
        }
        save(); toast('Movimiento eliminado.');
      };
      openConfirm({ title: '¿Eliminar este movimiento?', body: type === 'inc' ? 'También se quitará lo que este ingreso apartó en tus sobres.' : 'Esta acción no se puede deshacer.', yes: 'Eliminar', danger: true });
    },
    confirmYes: function () { ui.sheet = null; var f = pendingConfirm; pendingConfirm = null; if (f) f(); else render(); },
    // ajustes
    toggleCfgAdelantar: function () { ui.cfgDraft.adelantar = !ui.cfgDraft.adelantar; render(); },
    saveCfg: function () {
      var d = ui.cfgDraft;
      var amt = d.amountText != null ? E.toCents(d.amountText) : d.amount;
      if (!amt) return toast('Escribe el monto por pago.');
      var hol = (d.holText != null ? d.holText : (d.holidays || []).join('\n')).split(/\s+/).filter(function (x) { return /^\d{4}-\d{2}-\d{2}$/.test(x); });
      var cfg = normalizeCfg({ mode: d.mode, days: d.days, adelantar: d.adelantar, holidays: hol });
      if (cfg.mode === 'quincenal' && cfg.days[0] >= cfg.days[1]) return toast('El primer pago debe ser antes que el segundo.');
      cfg.amount = amt;
      S.cfg = cfg; save(); ui.cfgDraft = null; toast('Ingresos guardados.');
    },
    ruleTpl: function (id) { ui.ruleDraft = clone(TEMPLATES[id]); ui.ruleIdDraft = id; render(); },
    saveRule: function () {
      var r = ui.ruleDraft;
      r.groups.forEach(function (g) { g.pct = +g.pct || 0; g.name = (g.name || '').trim() || 'Grupo'; });
      var err = E.validateRule(r.groups);
      if (err) return toast(err);
      S.rule = clone(r); S.ruleId = ui.ruleIdDraft;
      var ids = S.rule.groups.filter(function (g) { return g.spend; }).map(function (g) { return g.id; });
      S.cats.forEach(function (c) { if (ids.indexOf(c.g) === -1) c.g = firstSpendGroup(); });
      save(); ui.ruleDraft = null; toast('Regla guardada. Se usará en tus próximos ingresos.');
    },
    newFixed: function () { ui.sheet = { type: 'fixed', id: null, name: '', amt: '', day: '' }; render(); },
    editFixed: function (id) { var f = S.fixed.filter(function (x) { return x.id === id; })[0]; if (!f) return; ui.sheet = { type: 'fixed', id: id, name: f.name, amt: centsToInput(f.amount), day: String(f.day) }; render(); },
    saveFixed: function () {
      var s = ui.sheet, name = (s.name || '').trim(), amt = E.toCents(s.amt), day = parseInt(s.day, 10);
      if (!name || !amt || !(day >= 1 && day <= 31)) return toast('Completa nombre, monto y un día entre 1 y 31.');
      if (s.id) { var f = S.fixed.filter(function (x) { return x.id === s.id; })[0]; f.name = name; f.amount = amt; f.day = day; }
      else S.fixed.push({ id: uid(), name: name, amount: amt, day: day, active: true });
      save(); ui.sheet = null; toast('Gasto fijo guardado.');
    },
    delFixed: function () {
      var id = ui.sheet.id;
      pendingConfirm = function () { S.fixed = S.fixed.filter(function (x) { return x.id !== id; }); save(); toast('Gasto fijo eliminado.'); };
      openConfirm({ title: '¿Eliminar este gasto fijo?', body: 'Dejará de apartarse en tus próximos pagos. Los movimientos ya registrados se conservan.', yes: 'Eliminar', danger: true });
    },
    addCat: function () {
      var n = (ui.newCat.name || '').trim();
      if (!n) return toast('Escribe el nombre de la categoría.');
      S.cats.push({ id: uid(), name: n, g: ui.newCat.g || firstSpendGroup() }); ui.newCat.name = ''; save(); render();
    },
    delCat: function (id) {
      if (S.expenses.some(function (e) { return e.cat === id; })) return toast('Esta categoría tiene gastos registrados; no se puede eliminar.');
      S.cats = S.cats.filter(function (c) { return c.id !== id; }); save(); render();
    },
    exportData: function () { exportData(); },
    askReset: function () {
      pendingConfirm = function () { try { localStorage.removeItem(KEY); } catch (e) { } S = freshState(); ui.screen = 'onboard'; ui.ob.step = 1; render(); };
      openConfirm({ title: '¿Borrar todos los datos?', body: 'Se eliminarán tu configuración y todos tus movimientos de este celular. Exporta un respaldo antes si lo necesitas.', yes: 'Borrar todo', danger: true });
    },
    enableNotif: function () {
      if (!('Notification' in window)) return;
      Notification.requestPermission().then(function () { render(); maybeNotify(); });
    },
    // onboarding
    obMode: function (m) { ui.ob.mode = m; render(); },
    obAdelantar: function () { ui.ob.adelantar = !ui.ob.adelantar; render(); },
    obRule: function (id) { ui.ob.ruleId = id; render(); },
    obAddFixed: function () {
      var o = ui.ob, amt = E.toCents(o.fAmt), day = parseInt(o.fDay, 10), name = (o.fName || '').trim();
      if (!name || !amt || !(day >= 1 && day <= 31)) return toast('Completa nombre, monto y un día entre 1 y 31.');
      o.fixed.push({ id: uid(), name: name, amount: amt, day: day, active: true }); o.fName = ''; o.fAmt = ''; o.fDay = ''; render();
    },
    obDelFixed: function (i) { ui.ob.fixed.splice(+i, 1); render(); },
    obBack: function () { ui.ob.step--; render(); },
    obNext: function () {
      var o = ui.ob;
      if (o.step === 1 && o.mode === 'quincenal' && o.d1 >= o.d2) return toast('El primer pago debe ser antes que el segundo.');
      if (o.step === 2 && !E.toCents(o.amount)) return toast('Escribe cuánto recibes en cada pago.');
      if (o.step < 4) { o.step++; return render(); }
      if (o.fName || o.fAmt) return toast('Tienes un gasto fijo sin agregar. Tócalo en "Agregar" o borra los campos.');
      S.cfg = normalizeCfg({ mode: o.mode, days: o.mode === 'mensual' ? [o.d2] : [o.d1, o.d2], adelantar: o.adelantar, holidays: [] });
      S.cfg.amount = E.toCents(o.amount);
      S.ruleId = o.ruleId; S.rule = clone(TEMPLATES[o.ruleId]); S.fixed = o.fixed; S.onboarded = true;
      save(); requestPersist(); ui.screen = 'home'; render();
    }
  };

  // ---------- app instalada (APK) ----------
  var isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  function capPlugin(name) {
    var C = window.Capacitor;
    if (!C) return null;
    if (C.Plugins && C.Plugins[name]) return C.Plugins[name];
    if (C.registerPlugin) { try { return C.registerPlugin(name); } catch (e) { } }
    return null;
  }

  // ---------- respaldo ----------
  function exportData() {
    var data = JSON.stringify({ app: 'ahorramas', version: VERSION, exportedAt: new Date().toISOString(), state: S }, null, 2);
    var name = 'ahorramas-respaldo-' + today() + '.json';
    var done = function () { S.lastBackup = today(); save(); toast('Respaldo exportado: ' + name); };
    if (isNative) {
      var FS = capPlugin('Filesystem'), SH = capPlugin('Share');
      if (FS && SH) {
        FS.writeFile({ path: name, data: data, directory: 'CACHE', encoding: 'utf8' })
          .then(function (r) { return SH.share({ title: 'Respaldo AHORRA+', files: [r.uri], dialogTitle: 'Guardar o enviar respaldo' }); })
          .then(done)
          .catch(function (e) { if (!/cancel/i.test(String(e && (e.message || e)))) toast('No se pudo exportar: ' + (e && e.message ? e.message : e)); });
        return;
      }
    }
    try {
      var file = new File([data], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: 'Respaldo AHORRA+' }).then(done).catch(function (e) { if (e && e.name !== 'AbortError') download(); });
        return;
      }
    } catch (e) { }
    download();
    function download() {
      var url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
      var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000); done();
    }
  }
  function importFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var obj;
      try { obj = JSON.parse(reader.result); } catch (e) { return toast('El archivo no es un respaldo válido.'); }
      if (!obj || obj.app !== 'ahorramas' || !obj.state || obj.state.v !== 1) return toast('El archivo no es un respaldo de AHORRA+.');
      pendingConfirm = function () { S = Object.assign(freshState(), obj.state); save(); ui.screen = S.onboarded ? 'home' : 'onboard'; ui.cfgDraft = null; ui.ruleDraft = null; toast('Respaldo importado.'); };
      openConfirm({ title: '¿Reemplazar tus datos?', body: 'Se cargará el respaldo del ' + (obj.exportedAt ? obj.exportedAt.slice(0, 10) : 'archivo') + ' y se reemplazará todo lo que hay en este celular.', yes: 'Importar', danger: true });
    };
    reader.readAsText(file);
  }

  // ---------- notificaciones ----------
  function maybeNotify() {
    if (!('Notification' in window) || Notification.permission !== 'granted' || !S.onboarded) return;
    var t = today(), a = currentAlerts().list.filter(function (x) { return x.level === 'warn' || x.level === 'danger' || x.level === 'action'; });
    var fresh = a.filter(function (x) { return !S.notified[x.key]; });
    if (!fresh.length) return;
    fresh.forEach(function (x) {
      S.notified[x.key] = t;
      var opts = { body: x.body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: x.key };
      if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(function (reg) { reg.showNotification(x.title, opts); });
      else { try { new Notification(x.title, opts); } catch (e) { } }
    });
    Object.keys(S.notified).forEach(function (k) { if (E.diffDays(S.notified[k], t) > 60) delete S.notified[k]; });
    save();
  }
  function requestPersist() { try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { } }

  // ---------- eventos ----------
  function setPath(obj, path, value) {
    var p = path.split('.'), o = obj;
    for (var i = 0; i < p.length - 1; i++) o = o[p[i]];
    o[p[p.length - 1]] = value;
  }
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-act]');
    if (!el || el.disabled) return;
    var act = el.getAttribute('data-act');
    if (act !== 'scrim' && ev.target.closest('[data-stop]') && !el.closest('[data-stop]')) return;
    if (actions[act]) actions[act](el.getAttribute('data-arg'), el, ev);
  });
  function onBind(ev) {
    var el = ev.target;
    var path = el.getAttribute && el.getAttribute('data-bind');
    if (!path) return;
    var v = el.value;
    if (el.getAttribute('data-num')) { v = parseInt(el.value, 10); if (isNaN(v)) v = ''; }
    setPath(ui, path, v);
    if (path === 'cfgDraft.mode') {
      var d = ui.cfgDraft.days;
      ui.cfgDraft.days = v === 'mensual' ? [d[d.length - 1] || 31] : (d.length === 1 ? [15, d[0]] : d);
    }
    if (el.getAttribute('data-preview')) {
      var box = document.getElementById('incPreview');
      if (box && ui.sheet) box.innerHTML = ui.sheet.type === 'pay' ? payHTML(ui.sheet) : planHTML(ui.sheet);
    }
    if (ev.type === 'change' && el.getAttribute('data-rerender')) render();
  }
  document.addEventListener('input', onBind);
  document.addEventListener('change', function (ev) {
    var el = ev.target;
    if (el.id === 'importFile' && el.files && el.files[0]) { importFile(el.files[0]); el.value = ''; return; }
    var cg = el.getAttribute && el.getAttribute('data-catgroup');
    if (cg) { var c = catOf(cg); if (c) { c.g = el.value; save(); toast('Categoría actualizada.'); } return; }
    onBind(ev);
    if (el.getAttribute && el.getAttribute('data-rerender-blur')) render();
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && ui.sheet) { ui.sheet = null; render(); }
  });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { render(); maybeNotify(); } });

  // ---------- arranque ----------
  if (isNative) {
    // En el APK los archivos ya vienen dentro de la app: sin service worker, para que cada actualización se vea al instante.
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
      navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.unregister(); }); }).catch(function () { });
    }
    var AppP = capPlugin('App');
    if (AppP && AppP.addListener) {
      AppP.addListener('backButton', function () {
        if (ui.sheet) { ui.sheet = null; render(); }
        else if (ui.screen === 'onboard' && ui.ob.step > 1) { ui.ob.step--; render(); }
        else if (ui.screen !== 'home' && ui.screen !== 'onboard') { actions.go('home'); }
        else if (ui.view) { ui.view = null; render(); }
        else if (AppP.exitApp) AppP.exitApp();
      });
    }
  } else if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('sw.js').catch(function () { });
  }
  render();
  maybeNotify();
  window.__ahorramas = { state: function () { return S; } };
})();
