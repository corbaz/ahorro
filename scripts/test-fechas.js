#!/usr/bin/env node
/* test-fechas.js — casos de la grilla de vencimientos.
   Extrae las funciones reales de index.html y las corre con node puro (sin dependencias).
   Uso: node scripts/test-fechas.js
   Cubre las reglas D1..D7 de la frecuencia DIARIA (ver PAGOS.md). */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Extrae "function nombre(...){ ... }" asumiendo cierre con "}" en columna 0.
function grab(name) {
  const re = new RegExp('^function ' + name + '\\([^)]*\\)\\{[\\s\\S]*?^\\}', 'm');
  const m = html.match(re);
  if (!m) throw new Error('no se encontro la funcion ' + name + ' en index.html');
  return m[0];
}

let state = {};
const pendientes = () => state.cuotas.filter(c => !c.paid);
eval([
  grab('fechasGrillaFija'),
  grab('asignarFechasPlan'),
  grab('rebalancearFechas'),
  grab('cuotasPorFrecuencia'),
].join('\n'));

/* ---- helpers de test ---- */
const day = (iso) => new Date(iso).toISOString().slice(0, 10);
const plus = (isoDay, n) => {
  const d = new Date(isoDay + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const cuota = (n) => state.cuotas.find(c => c.n === n);

let pass = 0, fail = 0;
function check(label, actual, expected) {
  if (actual === expected) { pass++; console.log('  ok   ' + label + ' = ' + actual); }
  else { fail++; console.log('  FAIL ' + label + ': esperado ' + expected + ', obtenido ' + actual); }
}

function nuevoPlan(inicio, fin) {
  const n = cuotasPorFrecuencia('diaria', inicio, fin);
  state = {
    frecuencia: 'diaria',
    fechaInicio: inicio + 'T12:00:00',
    fechaFin: fin + 'T12:00:00',
    numDep: n,
    cuotas: Array.from({ length: n }, (_, i) => ({ n: i + 1, paid: false, fecha: null })),
  };
  asignarFechasPlan();
  return n;
}
function pagar(ns) {
  ns.forEach(n => { cuota(n).paid = true; });
  rebalancearFechas();
}

/* ---- D5: N = dias + 1 (el dia del fin tiene cuota) ---- */
console.log('\nD5 · N = dias + 1, la ultima cuota cae el dia del fin');
{
  const n = nuevoPlan('2026-09-01', '2026-12-09');
  check('cuotas entre 01/09 y 09/12', n, 100);
  check('cuota 1', day(cuota(1).fecha), '2026-09-01');
  check('cuota 100 (fin)', day(cuota(100).fecha), '2026-12-09');
}

/* ---- D1/D2: pendiente j = inicio + pagadas + (j-1) ---- */
console.log('\nD1/D2 · pago adelantado antes del inicio (3 cuotas)');
{
  nuevoPlan('2026-09-03', '2026-12-11');
  check('cuota 4 antes de pagar', day(cuota(4).fecha), '2026-09-06');
  pagar([1, 2, 3]);
  check('cuota 4 (primera pendiente = inicio + 3)', day(cuota(4).fecha), '2026-09-06');
  check('cuota 5', day(cuota(5).fecha), '2026-09-07');
  check('cuota 100 (fin intacto)', day(cuota(100).fecha), '2026-12-11');
}

/* ---- D3: el fin no se mueve en ningun escenario ---- */
console.log('\nD3 · el fin es intocable = inicio + N - 1');
{
  const n = nuevoPlan('2026-09-01', '2026-12-09');
  const fin = plus('2026-09-01', n - 1);
  [[], [1], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]].forEach(ns => {
    nuevoPlan('2026-09-01', '2026-12-09');
    pagar(ns);
    check('fin con ' + ns.length + ' pagadas', day(cuota(n).fecha), fin);
  });
}

/* ---- D4: atraso deja pendientes con fecha pasada (vencidas) ---- */
console.log('\nD4 · atraso: las pendientes NO se corren, quedan vencidas');
{
  nuevoPlan('2026-09-03', '2026-12-11');
  pagar([1, 2, 3, 4]);                       // hoy seria 13/09 y solo pago 4
  check('cuota 5 (inicio + 4, ya vencida)', day(cuota(5).fecha), '2026-09-07');
  check('cuota 11', day(cuota(11).fecha), '2026-09-13');
  check('cuota 100 (fin intacto)', day(cuota(100).fecha), '2026-12-11');
}

/* ---- D7: pago fuera de orden, las pendientes se recorren sin huecos ---- */
console.log('\nD7 · pago fuera de orden (cuotas 1 y 7)');
{
  const n = nuevoPlan('2026-09-01', '2026-12-09');
  pagar([1, 7]);
  check('cuota 2 (inicio + 2 pagadas)', day(cuota(2).fecha), '2026-09-03');
  check('cuota 3', day(cuota(3).fecha), '2026-09-04');
  check('cuota 6', day(cuota(6).fecha), '2026-09-07');
  check('cuota 8 (sube al hueco de la 7)', day(cuota(8).fecha), '2026-09-08');
  check('cuota 100 (fin intacto)', day(cuota(n).fecha), '2026-12-09');
  const dias = state.cuotas.filter(c => !c.paid).map(c => day(c.fecha));
  check('sin huecos entre pendientes', new Set(dias).size, dias.length);
}

/* ---- D6: todos los dias, incluidos sabados y domingos ---- */
console.log('\nD6 · la grilla incluye fines de semana');
{
  nuevoPlan('2026-09-04', '2026-09-13');     // arranca viernes
  check('cuota 1 viernes', day(cuota(1).fecha), '2026-09-04');
  check('cuota 2 sabado', day(cuota(2).fecha), '2026-09-05');
  check('cuota 3 domingo', day(cuota(3).fecha), '2026-09-06');
  check('cuota 4 lunes', day(cuota(4).fecha), '2026-09-07');
}

/* ---- D8: los montos se fijan al generar el plan; pagar solo mueve fechas ---- */
console.log('\nD8 · adelantar cuotas NO recalcula montos');
{
  nuevoPlan('2026-09-01', '2026-12-09');
  state.cuotas.forEach(c => { c.monto = c.n; });          // progresivo: cuota n vale n
  const antes = state.cuotas.map(c => c.monto).join(',');
  pagar([1, 2, 4]);                                        // pago fuera de orden y adelantado
  check('montos intactos tras pagar', state.cuotas.map(c => c.monto).join(','), antes);
  check('cuota 3 solo cambio de fecha', day(cuota(3).fecha), '2026-09-04');
  check('monto de la cuota 3', cuota(3).monto, 3);
}

/* ---- bordes de cuotasPorFrecuencia ---- */
console.log('\nBordes · fechas limite');
{
  check('inicio = fin (una sola cuota ese dia)', cuotasPorFrecuencia('diaria', '2026-09-01', '2026-09-01'), 1);
  check('inicio = fin en mensual', cuotasPorFrecuencia('mensual', '2026-09-01', '2026-09-01'), 1);
  check('fin anterior al inicio (invalido)', cuotasPorFrecuencia('diaria', '2026-12-01', '2026-09-01'), 0);
  check('fin anterior al inicio en mensual', cuotasPorFrecuencia('mensual', '2026-12-01', '2026-09-01'), 0);
  check('un dia de diferencia', cuotasPorFrecuencia('diaria', '2026-09-01', '2026-09-02'), 2);
}

console.log('\n' + (fail === 0 ? 'TODO OK' : 'HAY FALLAS') + ' · ' + pass + ' ok · ' + fail + ' fallan\n');
process.exit(fail === 0 ? 0 : 1);
