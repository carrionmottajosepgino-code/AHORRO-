const assert = require('node:assert/strict');
const test = require('node:test');
const E = require('../engine.js');

const Q = { mode: 'quincenal', days: [15, 31], adelantar: true, holidays: [] };
const RULE = { groups: [
  { id: 'nec', name: 'Necesidades', pct: 50, spend: true },
  { id: 'des', name: 'Deseos', pct: 30, spend: true },
  { id: 'aho', name: 'Ahorro', pct: 20, spend: false }] };
const CATS = [{ id: 'mer', g: 'nec' }, { id: 'oci', g: 'des' }];

test('calendario con adelanto por fin de semana', () => {
  assert.deepEqual(E.payDatesBetween('2026-10-20', '2026-12-20', Q), ['2026-10-30', '2026-11-13', '2026-11-30', '2026-12-15']);
  assert.equal(E.payDateIn(2027, 2, 31, Q), '2027-02-26');
  assert.equal(E.payDateIn(2027, 1, 31, Q), '2027-01-29');
});

test('sin adelanto las fechas no se mueven', () => {
  const k = Object.assign({}, Q, { adelantar: false });
  assert.deepEqual(E.payDatesBetween('2026-10-20', '2026-11-20', k), ['2026-10-31', '2026-11-15']);
});

test('día 30 en febrero → último día', () => {
  const k = { mode: 'mensual', days: [30], adelantar: false };
  assert.equal(E.payDateIn(2027, 2, 30, k), '2027-02-28');
  assert.equal(E.payDateIn(2028, 2, 30, k), '2028-02-29');
});

test('feriado configurado también se adelanta', () => {
  const k = Object.assign({}, Q, { holidays: ['2026-12-15'] });
  assert.equal(E.payDateIn(2026, 12, 15, k), '2026-12-14');
});

test('periodo actual', () => {
  const p = E.periodFor('2026-10-17', Q);
  assert.equal(p.start, '2026-10-15');
  assert.equal(p.end, '2026-10-29');
  assert.equal(p.dayIndex, 3);
  assert.equal(p.label, '2ª quincena de octubre');
  assert.equal(E.periodFor('2026-11-02', Q).label, '1ª quincena de noviembre');
});

test('provisión del alquiler 50/50 y recuperación si se salta', () => {
  const fixed = [{ id: 'alq', name: 'Alquiler', amount: 120000, day: 1 }];
  const st = { cfg: Q, rule: RULE, fixed, envelopes: {}, paid: {} };
  const p1 = E.planIncome(250000, '2026-10-15', st);
  assert.equal(p1.reserves[0].amount, 60000);
  assert.equal(p1.reserves[0].due, '2026-11-01');
  st.envelopes[p1.reserves[0].key] = 60000;
  assert.equal(E.planIncome(250000, '2026-10-30', st).reserves[0].amount, 60000);
  st.envelopes = {};
  assert.equal(E.planIncome(250000, '2026-10-30', st).reserves[0].amount, 120000);
});

test('distribución 50/30/20 con reservas', () => {
  const fixed = [{ id: 'alq', name: 'Alquiler', amount: 120000, day: 1 }, { id: 'int', name: 'Internet', amount: 12000, day: 20 }];
  const p = E.planIncome(250000, '2026-10-15', { cfg: Q, rule: RULE, fixed, envelopes: {}, paid: {} });
  assert.deepEqual(p.alloc, { nec: 125000, des: 75000, aho: 50000 });
  assert.equal(p.committed.nec, 72000);
  assert.equal(p.committed.aho, 0);
});

test('déficit sale de deseos, nunca del ahorro', () => {
  const fixed = [{ id: 'alq', name: 'Alquiler', amount: 300000, day: 20 }];
  const p = E.planIncome(250000, '2026-10-15', { cfg: Q, rule: RULE, fixed, envelopes: {}, paid: {} });
  assert.equal(p.committed.nec, 125000);
  assert.equal(p.committed.des, 175000);
  assert.equal(p.committed.aho, 0);
  assert.equal(p.overflow, true);
});

test('redondeo sin perder céntimos', () => {
  const a = E.splitByRule(100001, RULE.groups);
  assert.equal(a.nec + a.des + a.aho, 100001);
});

test('regla que no suma 100', () => {
  assert.ok(E.validateRule([{ pct: 50, spend: true }, { pct: 30, spend: false }]));
  assert.equal(E.validateRule(RULE.groups), null);
});

test('ritmo alto en deseos', () => {
  const st = { cfg: Q, rule: RULE, cats: CATS, fixed: [], envelopes: {}, paid: {},
    incomes: [{ id: 'i', kind: 'regular', period: '2026-10-15', date: '2026-10-15', alloc: { nec: 125000, des: 75000, aho: 50000 }, committed: { nec: 0, des: 0, aho: 0 } }],
    expenses: [{ id: 'e', date: '2026-10-16', amount: 52500, cat: 'oci' }] };
  // periodo 15–29 oct (15 días), día 22 → día 8
  const s = E.summarize(st, '2026-10-22');
  const des = s.groups.find(g => g.id === 'des');
  assert.equal(s.period.dayIndex, 8);
  assert.equal(Math.round(des.used * 100), 70);
  assert.equal(des.status, 'fast');
  assert.equal(des.remaining, 22500);
  const al = E.alerts(st, s, '2026-10-22');
  assert.ok(al.list.some(a => a.title === 'Ritmo alto en Deseos'));
});

test('money', () => {
  assert.equal(E.money(123456), 'S/ 1,234.56');
  assert.equal(E.money(-500), '−S/ 5.00');
  assert.equal(E.toCents('12.5'), 1250);
});
