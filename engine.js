/* Motor de cálculo — Dart-free, framework-free. Montos en céntimos (enteros). Fechas 'YYYY-MM-DD'. */
(function (root) {
  'use strict';

  // ---------- Fechas ----------
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toStr(y, m, d) { return y + '-' + pad(m) + '-' + pad(d); }
  function parts(s) { return { y: +s.slice(0, 4), m: +s.slice(5, 7), d: +s.slice(8, 10) }; }
  function toUTC(s) { var p = parts(s); return Date.UTC(p.y, p.m - 1, p.d); }
  function fromUTC(t) { var x = new Date(t); return toStr(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate()); }
  function addDays(s, n) { return fromUTC(toUTC(s) + n * 86400000); }
  function diffDays(a, b) { return Math.round((toUTC(b) - toUTC(a)) / 86400000); } // b - a
  function lastDay(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
  function dow(s) { return new Date(toUTC(s)).getUTCDay(); } // 0 = domingo
  function today(now) {
    var x = now || new Date();
    return toStr(x.getFullYear(), x.getMonth() + 1, x.getDate());
  }
  var MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var MONTHS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  function short(s) { var p = parts(s); return p.d + ' ' + MONTHS[p.m - 1]; }
  function withDow(s) { return DAYS[dow(s)] + ' ' + short(s); }

  // ---------- Dinero ----------
  function money(c) {
    var neg = c < 0;
    var a = Math.abs(Math.round(c));
    var ent = Math.floor(a / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '−' : '') + 'S/ ' + ent + '.' + pad(a % 100);
  }
  function toCents(text) {
    if (text === null || text === undefined) return 0;
    var t = String(text).replace(/[^0-9.,]/g, '').replace(',', '.');
    var v = parseFloat(t);
    return isFinite(v) ? Math.round(v * 100) : 0;
  }

  // ---------- Calendario de pagos ----------
  // cfg: { mode: 'quincenal'|'mensual', days: [15, 31] | [31], adelantar: bool, holidays: ['YYYY-MM-DD'] }
  function isNonWorking(s, cfg) {
    var w = dow(s);
    return w === 0 || w === 6 || (cfg.holidays || []).indexOf(s) !== -1;
  }
  function payDateIn(y, m, day, cfg) {
    var s = toStr(y, m, Math.min(day, lastDay(y, m)));
    if (cfg.adelantar) { var guard = 0; while (isNonWorking(s, cfg) && guard++ < 10) s = addDays(s, -1); }
    return s;
  }
  function scheduleDays(cfg) { return cfg.mode === 'mensual' ? [cfg.days[cfg.days.length - 1]] : cfg.days.slice(0, 2); }
  function payDatesBetween(from, to, cfg) {
    var a = parts(from), b = parts(to), out = [];
    var y = a.y, m = a.m - 1;
    if (m < 1) { m = 12; y--; }
    var endY = b.y, endM = b.m + 1;
    if (endM > 12) { endM = 1; endY++; }
    while (y < endY || (y === endY && m <= endM)) {
      scheduleDays(cfg).forEach(function (d) { out.push(payDateIn(y, m, d, cfg)); });
      m++; if (m > 12) { m = 1; y++; }
    }
    out = out.filter(function (s, i) { return s >= from && s <= to && out.indexOf(s) === i; });
    out.sort();
    return out;
  }

  // ---------- Periodos ----------
  function periodLabel(start, cfg) {
    var p = parts(start);
    var nm = p.m === 12 ? 1 : p.m + 1;
    if (cfg.mode === 'mensual') return p.d >= 20 ? cap(MONTHS_LONG[nm - 1]) : cap(MONTHS_LONG[p.m - 1]);
    if (p.d >= 25) return '1ª quincena de ' + MONTHS_LONG[nm - 1];
    if (p.d >= 10) return '2ª quincena de ' + MONTHS_LONG[p.m - 1];
    return '1ª quincena de ' + MONTHS_LONG[p.m - 1];
  }
  function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function periodFor(day, cfg) {
    var pays = payDatesBetween(addDays(day, -75), addDays(day, 75), cfg);
    var start = null, next = null;
    pays.forEach(function (p) { if (p <= day) start = p; else if (!next) next = p; });
    var end = addDays(next, -1);
    return {
      start: start, end: end, next: next,
      days: diffDays(start, end) + 1,
      dayIndex: diffDays(start, day) + 1,
      label: periodLabel(start, cfg),
      range: short(start) + ' – ' + short(end)
    };
  }

  // ---------- Gastos fijos y sobres ----------
  function nextDue(fx, from) {
    var p = parts(from);
    var s = toStr(p.y, p.m, Math.min(fx.day, lastDay(p.y, p.m)));
    if (s < from) {
      var y = p.m === 12 ? p.y + 1 : p.y, m = p.m === 12 ? 1 : p.m + 1;
      s = toStr(y, m, Math.min(fx.day, lastDay(y, m)));
    }
    return s;
  }
  function envKey(fx, due) { return fx.id + '@' + due; }
  function paysBefore(from, due, cfg) {
    // pagos programados en [from, due)
    if (due <= from) return 0;
    return payDatesBetween(from, addDays(due, -1), cfg).length;
  }

  // ---------- Distribución ----------
  // rule.groups: [{id, name, pct, color, spend}] ; spend=false => ahorro (no gastable)
  function splitByRule(amount, groups) {
    var out = {}, used = 0;
    groups.forEach(function (g, i) {
      var v = i === groups.length - 1 ? amount - used : Math.floor(amount * g.pct / 100);
      out[g.id] = v; used += v;
    });
    return out;
  }
  function validateRule(groups) {
    var sum = groups.reduce(function (a, g) { return a + (+g.pct || 0); }, 0);
    if (Math.round(sum * 100) !== 10000) return 'Los porcentajes deben sumar 100 (ahora suman ' + sum + ').';
    if (!groups.some(function (g) { return g.spend; })) return 'Debe existir al menos un grupo para gastar.';
    return null;
  }
  /*
   * plan para un ingreso regular recibido en el periodo que empieza en periodStart.
   * state: { cfg, rule, fixed, envelopes, paid }
   */
  function planIncome(amount, periodStart, state, opts) {
    opts = opts || {};
    var groups = state.rule.groups;
    var alloc = opts.allToSavings ? savingsOnly(amount, groups) : splitByRule(amount, groups);
    var reserves = [];
    if (!opts.extra) {
      (state.fixed || []).filter(function (f) { return f.active !== false; }).forEach(function (fx) {
        var due = nextDue(fx, periodStart);
        var key = envKey(fx, due);
        if (state.paid && state.paid[key]) return;
        var bal = (state.envelopes && state.envelopes[key]) || 0;
        var remaining = fx.amount - bal;
        if (remaining <= 0) return;
        var n = Math.max(1, paysBefore(periodStart, due, state.cfg));
        var cuota = n === 1 ? remaining : Math.ceil(remaining / n);
        reserves.push({ fixedId: fx.id, name: fx.name, due: due, key: key, amount: cuota, step: n, target: fx.amount, before: bal });
      });
    }
    var committed = {};
    groups.forEach(function (g) { committed[g.id] = 0; });
    var need = reserves.reduce(function (a, r) { return a + r.amount; }, 0);
    var order = groups.filter(function (g) { return g.spend; });
    // primero el grupo de necesidades (o el primero gastable), luego el resto gastable; nunca ahorro
    var needs = order.filter(function (g) { return g.id === 'nec'; });
    var rest = order.filter(function (g) { return g.id !== 'nec'; });
    var seq = needs.concat(rest);
    var overflow = false;
    seq.forEach(function (g, i) {
      if (need <= 0) return;
      var take = Math.min(need, alloc[g.id]);
      if (i === seq.length - 1) take = need; // el último absorbe lo que falte (queda negativo)
      committed[g.id] += take; need -= take;
      if (i > 0 && take > 0) overflow = true;
    });
    return { alloc: alloc, committed: committed, reserves: reserves, overflow: overflow };
  }
  function savingsOnly(amount, groups) {
    var out = {};
    var sav = groups.filter(function (g) { return !g.spend; })[0] || groups[0];
    groups.forEach(function (g) { out[g.id] = g.id === sav.id ? amount : 0; });
    return out;
  }

  // ---------- Resumen del periodo ----------
  function summarize(state, day) {
    var per = periodFor(day, state.cfg);
    var groups = state.rule.groups;
    var catGroup = {};
    (state.cats || []).forEach(function (c) { catGroup[c.id] = c.g; });
    var incomes = (state.incomes || []).filter(function (i) { return i.period === per.start; });
    var regular = incomes.filter(function (i) { return i.kind === 'regular'; })[0] || null;
    var expenses = (state.expenses || []).filter(function (e) { return e.date >= per.start && e.date <= per.end; });
    var elapsed = per.dayIndex / per.days;
    var daysLeft = per.days - per.dayIndex + 1;
    var total = { libre: 0, spent: 0 };
    var gs = groups.map(function (g) {
      var asig = 0, comp = 0;
      incomes.forEach(function (i) { asig += (i.alloc[g.id] || 0); comp += (i.committed[g.id] || 0); });
      var libre = asig - comp;
      var spent = expenses.filter(function (e) { return !e.envelope && catGroup[e.cat] === g.id; })
        .reduce(function (a, e) { return a + e.amount; }, 0);
      spent += expenses.filter(function (e) { return e.shortfallGroup === g.id; }).reduce(function (a, e) { return a + e.shortfall; }, 0);
      var used = g.spend && libre > 0 ? spent / libre : (g.spend && spent > 0 ? 1 : 0);
      var pace = elapsed > 0 ? used / elapsed : 0;
      var status = 'ok';
      if (g.spend && incomes.length) {
        if (used >= 1 && spent > 0) status = 'over';
        else if (pace > 1.2 && used >= 0.5 && per.dayIndex > 2) status = 'fast';
        else if (pace >= 0.9 && per.dayIndex > 2) status = 'watch';
      }
      if (g.spend) { total.libre += libre; total.spent += spent; }
      return { id: g.id, name: g.name, color: g.color, pct: g.pct, spend: g.spend, asig: asig, committed: comp,
        libre: libre, spent: spent, remaining: libre - spent, used: used, pace: pace, status: status };
    });
    var available = total.libre - total.spent;
    // sobres del ciclo relevante
    var envelopes = (state.fixed || []).filter(function (f) { return f.active !== false; }).map(function (fx) {
      var due = nextDue(fx, per.start);
      var key = envKey(fx, due);
      var bal = (state.envelopes && state.envelopes[key]) || 0;
      var paid = !!(state.paid && state.paid[key]);
      return { id: fx.id, name: fx.name, amount: fx.amount, due: due, key: key, balance: bal, paid: paid,
        daysTo: diffDays(day, due), complete: bal >= fx.amount };
    }).sort(function (a, b) { return a.due < b.due ? -1 : 1; });
    return {
      period: per, groups: gs, available: available, perDay: daysLeft > 0 ? Math.floor(available / daysLeft) : available,
      daysLeft: daysLeft, elapsed: elapsed, spentTotal: total.spent, libreTotal: total.libre,
      usedTotal: total.libre > 0 ? total.spent / total.libre : 0,
      incomes: incomes, regular: regular, expenses: expenses, envelopes: envelopes,
      reserved: envelopes.reduce(function (a, e) { return a + (e.paid ? 0 : e.balance); }, 0)
    };
  }

  // ---------- Alertas ----------
  function alerts(state, sum, day) {
    var out = [];
    var per = sum.period;
    if (!sum.regular) {
      out.push({ key: 'income@' + per.start, level: 'action', tag: 'Ingreso', title: '¿Ya recibiste tu pago del ' + short(per.start) + '?',
        body: 'Regístralo para distribuirlo con tu regla y apartar tus sobres.', action: 'income' });
    }
    sum.groups.forEach(function (g) {
      if (!g.spend) return;
      if (g.status === 'over') out.push({ key: 'over@' + g.id + '@' + per.start, level: 'danger', tag: 'Ritmo de gasto',
        title: 'Superaste ' + g.name + ' por ' + money(-g.remaining),
        body: 'Cúbrelo con lo que queda en otros grupos o descuéntalo del próximo pago.' });
      else if (g.status === 'fast') out.push({ key: 'fast@' + g.id + '@' + per.start, level: 'warn', tag: 'Ritmo de gasto',
        title: 'Ritmo alto en ' + g.name,
        body: 'Has gastado el ' + Math.round(g.used * 100) + '% de ' + g.name + ' y vas en el día ' + per.dayIndex + ' de ' + per.days +
          '. Te quedan ' + money(g.remaining) + ' (≈ ' + money(Math.floor(g.remaining / sum.daysLeft)) + ' por día).' });
    });
    sum.envelopes.forEach(function (e) {
      if (e.paid) return;
      if (e.daysTo < 0) out.push({ key: 'late@' + e.key, level: 'danger', tag: 'Gasto fijo', title: e.name + ' venció el ' + short(e.due),
        body: 'Márcalo como pagado cuando lo pagues.', action: 'envelopes' });
      else if (e.daysTo <= 3) out.push({ key: 'due@' + e.key, level: e.complete ? 'info' : 'warn', tag: 'Recordatorio',
        title: e.name + ' vence ' + (e.daysTo === 0 ? 'hoy' : e.daysTo === 1 ? 'mañana' : 'en ' + e.daysTo + ' días'),
        body: e.complete ? 'El sobre tiene el monto completo (' + money(e.amount) + ').'
          : 'Al sobre le faltan ' + money(e.amount - e.balance) + '. La diferencia saldrá de Necesidades.', action: 'envelopes' });
    });
    if (state.lastBackup) {
      if (diffDays(state.lastBackup, day) > 30) out.push({ key: 'backup', level: 'info', tag: 'Respaldo', title: 'Haz un respaldo de tus datos',
        body: 'Tu último respaldo fue hace más de 30 días.', action: 'backup' });
    } else if ((state.expenses || []).length >= 10) {
      out.push({ key: 'backup', level: 'info', tag: 'Respaldo', title: 'Haz tu primer respaldo', body: 'Guarda una copia por si cambias de celular.', action: 'backup' });
    }
    var important = out.filter(function (a) { return a.level === 'danger' || a.level === 'warn' || a.level === 'action'; }).length;
    if (!important && sum.regular) out.push({ key: 'good', level: 'good', tag: 'Buen ritmo', title: 'Vas en ritmo este periodo',
      body: 'Ningún grupo supera el ritmo ideal para el día ' + per.dayIndex + ' de ' + per.days + '.' });
    return { list: out, important: important };
  }

  var api = {
    pad: pad, toStr: toStr, parts: parts, addDays: addDays, diffDays: diffDays, lastDay: lastDay, dow: dow, today: today,
    short: short, withDow: withDow, money: money, toCents: toCents, MONTHS_LONG: MONTHS_LONG,
    payDateIn: payDateIn, payDatesBetween: payDatesBetween, periodFor: periodFor, nextDue: nextDue, envKey: envKey,
    paysBefore: paysBefore, splitByRule: splitByRule, validateRule: validateRule, planIncome: planIncome,
    summarize: summarize, alerts: alerts
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Engine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
