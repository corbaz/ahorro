#!/usr/bin/env node
/* check-syntax.js — valida la sintaxis del JS embebido en index.html.
   El HTML es autocontenido y no tiene build, asi que un error de sintaxis
   solo se descubre abriendo el navegador. Esto lo detecta antes.
   Uso: node scripts/check-syntax.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const file = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(file, 'utf8');

// bloques <script> sin src (los que llevan codigo inline)
const bloques = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
if (!bloques.length) { console.error('no se encontro ningun <script> inline en index.html'); process.exit(1); }

let fail = 0;
bloques.forEach((m, i) => {
  const linea = html.slice(0, m.index).split('\n').length;
  try {
    new vm.Script(m[1], { filename: 'index.html <script #' + (i + 1) + '>' });
    console.log('  ok   script #' + (i + 1) + ' (linea ' + linea + ') · ' + m[1].split('\n').length + ' lineas');
  } catch (e) {
    fail++;
    console.log('  FAIL script #' + (i + 1) + ' (linea ' + linea + '): ' + e.message);
  }
});

console.log('\n' + (fail === 0 ? 'SINTAXIS OK' : 'HAY ERRORES DE SINTAXIS') + ' · ' + bloques.length + ' bloque(s)\n');
process.exit(fail === 0 ? 0 : 1);
