// Načítání a ukládání CSV (oddělovač ; nebo , – pozná sám, zvládne uvozovky a BOM z Excelu).
import { parseYmd, ymd, PRIORITY, TARGETS, REPEAT } from './core.js';

export function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  const firstLine = text.split(/\r?\n/)[0] || '';
  const sep = (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ';' : ',';
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === sep) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  if (!rows.length) return [];
  const head = rows[0].map((h) => h.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_'));
  return rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])));
}

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

export function tasksFromCsv(rows, me) {
  const tasks = [], errors = [];
  rows.forEach((r, i) => {
    const line = i + 2;
    const nazev = r.nazev || r.ukol || r.co;
    if (!nazev) { errors.push(`Řádek ${line}: chybí název.`); return; }
    const d = parseYmd(r.termin || r.datum);
    if (!d) { errors.push(`Řádek ${line} („${nazev}“): neplatný termín „${r.termin || ''}“ – použij RRRR-MM-DD.`); return; }
    const pr = norm(r.priorita);
    const priorita = PRIORITY[pr] ? pr : 'zajic';
    const komu = (r.komu || '').split(/[|,]/).map((x) => norm(x)).filter(Boolean);
    const role = komu.filter((k) => TARGETS[k]);
    const lide = komu.filter((k) => k.includes('@'));
    const unknown = komu.filter((k) => !TARGETS[k] && !k.includes('@'));
    if (unknown.length) errors.push(`Řádek ${line} („${nazev}“): neznámý příjemce ${unknown.join(', ')} – přeskočeno.`);
    let typ = norm(r.typ);
    if (!['osobni', 'prirazeny', 'spolecny', 'plosny'].includes(typ)) typ = role.length ? 'plosny' : (lide.length ? 'prirazeny' : 'osobni');
    const rep = norm(r.opakovani).replace(/[:\s].*$/, '');
    tasks.push({
      nazev,
      popis: r.popis || '',
      termin: ymd(d),
      cas: /^\d{1,2}:\d{2}$/.test(r.cas || '') ? r.cas.padStart(5, '0') : '',
      zobrazitDni: Math.max(0, parseInt(r.zobrazit_dni_predem || r.zobrazit || '7', 10) || 0),
      priorita,
      typ,
      cile: { role, lide },
      stitky: (r.stitky || '').split('|').map((s) => s.trim()).filter(Boolean),
      opakovani: REPEAT[rep] !== undefined ? rep : '',
      zdroj: r.zdroj || 'Import',
      zadal: me.email,
      zadalJmeno: me.jmeno,
      outlook: true,
      aktivni: true,
      kontrolni: [],
      plan: '',
    });
  });
  return { tasks, errors };
}

export function eventsFromCsv(rows) {
  const events = [], errors = [];
  rows.forEach((r, i) => {
    const od = parseYmd(r.od || r.datum);
    if (!r.nazev || !od) { errors.push(`Řádek ${i + 2}: chybí název nebo datum.`); return; }
    const doD = parseYmd(r.do) || od;
    const typ = ['akce', 'prazdniny', 'volno', 'rada', 'schuzky'].includes(norm(r.typ)) ? norm(r.typ) : 'akce';
    events.push({ nazev: r.nazev, od: ymd(od), do: ymd(doD), cas: r.cas || '', typ, zdroj: r.zdroj || 'Import' });
  });
  return { events, errors };
}

export function toCsv(rows, cols) {
  const esc = (v) => {
    const s = Array.isArray(v) ? v.join('|') : String(v ?? '');
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [cols.join(';'), ...rows.map((r) => cols.map((c) => esc(r[c])).join(';'))].join('\r\n');
}
