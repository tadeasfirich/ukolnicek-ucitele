// Úkolníček – jádro: role, priority, datumy, opakování a rozpis úkolů na lidi.
// Nezávislé na úložišti (ukázkový režim i SharePoint používají totéž).

export const ROLE_LABELS = {
  spravce: 'Správce',
  vedeni: 'Vedení',
  ucitel: 'Učitel',
  tridni: 'Třídní učitel',
  zastupce: 'Zástupce třídního',
  asistent: 'Asistent',
  provoz: 'Provoz',
};

// Komu lze úkol zadat plošně. „vsichni“ záměrně nezahrnuje provoz –
// typické učitelské úkoly se hospodářce, ekonomovi a vedoucí ŠJ nestahují.
export const TARGETS = {
  vsichni: 'Všichni pedagogové',
  ucitel: 'Učitelé',
  tridni: 'Třídní učitelé',
  zastupce: 'Zástupci třídních',
  asistent: 'Asistenti',
  vedeni: 'Vedení',
  provoz: 'Provoz',
  zamestnanci: 'Úplně všichni',
};

export const PRIORITY = {
  snek: { label: 'Šnek', hint: 'do konce měsíce', n: 1 },
  zajic: { label: 'Zajíc', hint: 'do konce týdne', n: 2 },
  gepard: { label: 'Gepard', hint: 'do zítra', n: 3 },
};
export const PRIORITY_ORDER = ['snek', 'zajic', 'gepard'];

export const STATUS = [
  { key: 0, label: 'Nezačato', short: 'Začít' },
  { key: 1, label: 'Rozpracováno', short: 'Dokončit' },
  { key: 2, label: 'Hotovo', short: 'Hotovo' },
];

export const REPEAT = {
  '': 'Neopakovat',
  tydne: 'Každý týden',
  mesicne: 'Každý měsíc (stejné datum)',
  'posledni-v-mesici': 'Poslední týden v měsíci',
};

export const TYPES = {
  osobni: 'Pro mě',
  prirazeny: 'Pro kolegu',
  spolecny: 'Společně',
  plosny: 'Plošně',
};

/* ---------- datumy (vše v místním čase zařízení) ---------- */

const WD_SHORT = ['ne', 'po', 'út', 'st', 'čt', 'pá', 'so'];
const WD_LONG = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
export const MONTHS = ['leden', 'únor', 'březen', 'duben', 'květen', 'červen', 'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'];

export const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function parseYmd(s) {
  if (!s) return null;
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s.trim());
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  const c = /^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/.exec(s.trim()); // 24. 11. 2026
  if (c) return new Date(+c[3], +c[2] - 1, +c[1]);
  return null;
}
export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes());
export const diffDays = (a, b) => Math.round((startOfDay(a) - startOfDay(b)) / 86400000);
export const isoWeekday = (d) => (d.getDay() + 6) % 7 + 1; // po=1 … ne=7
export const startOfWeek = (d) => addDays(startOfDay(d), 1 - isoWeekday(d));
export const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

/** Termín = datum + volitelný čas „HH:MM“. Bez času se počítá konec dne. */
export function dueDate(dateStr, cas) {
  const d = parseYmd(dateStr);
  if (!d) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(cas || '');
  if (m) d.setHours(+m[1], +m[2], 0, 0);
  else d.setHours(23, 59, 0, 0);
  return d;
}

export function fmtDate(d, withYear) {
  const now = new Date();
  const y = withYear || d.getFullYear() !== now.getFullYear() ? ` ${d.getFullYear()}` : '';
  return `${d.getDate()}. ${d.getMonth() + 1}.${y}`;
}
export const fmtWeekday = (d, long) => (long ? WD_LONG : WD_SHORT)[d.getDay()];

/** Lidsky čitelný termín + tón (pro barvu i text). */
export function fmtDue(termin, cas, now = new Date()) {
  const d = new Date(termin);
  const days = diffDays(d, now);
  const t = cas ? ` ${cas}` : '';
  if (days < 0) {
    const n = -days;
    return { text: `${n === 1 ? 'včera' : `před ${n} ${plural(n, 'dnem', 'dny', 'dny')}`} (${fmtDate(d)})`, tone: 'late' };
  }
  if (days === 0) {
    if (cas && d < now) return { text: `dnes ${cas} – už mělo být`, tone: 'late' };
    return { text: `dnes${t}`, tone: 'today' };
  }
  if (days === 1) return { text: `zítra${t}`, tone: 'soon' };
  if (days < 7) return { text: `${fmtWeekday(d)} ${fmtDate(d)}${t}`, tone: 'week' };
  return { text: `${fmtWeekday(d)} ${fmtDate(d)}${t}`, tone: '' };
}

export function plural(n, one, few, many) {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}

/* ---------- prázdniny a volna z harmonogramu ---------- */

export function holidaySet(events, extraDates = []) {
  const set = new Set(extraDates);
  for (const e of events || []) {
    if (e.typ !== 'prazdniny' && e.typ !== 'volno') continue;
    let d = parseYmd(e.od);
    const end = parseYmd(e.do || e.od);
    if (!d || !end) continue;
    while (d <= end) { set.add(ymd(d)); d = addDays(d, 1); }
  }
  return set;
}
const isOff = (d, hol) => hol.has(ymd(d)) || isoWeekday(d) > 5;

/* ---------- opakování ---------- */

/**
 * Výskyty úkolu (termíny) v intervalu [from, to].
 * - jednorázový: jen kotva
 * - tydne: každý týden ve stejný den jako kotva; o prázdninách se vynechá
 * - mesicne: stejné datum v měsíci; padne-li na volno, posune se na předchozí pracovní den
 * - posledni-v-mesici: poslední daný den v týdnu v měsíci (např. poslední pátek);
 *   padne-li na prázdniny, posune se na poslední pracovní den před nimi
 */
export function occurrences(task, from, to, hol = new Set()) {
  const anchor = dueDate(task.termin, task.cas);
  if (!anchor) return [];
  const rep = task.opakovani || '';
  const out = [];
  const timeOf = (d) => { const x = new Date(d); x.setHours(anchor.getHours(), anchor.getMinutes(), 0, 0); return x; };
  const shiftBack = (d) => { let x = d; let guard = 0; while (isOff(x, hol) && guard++ < 40) x = addDays(x, -1); return timeOf(x); };

  if (!rep) {
    if (anchor >= from && anchor <= to) out.push(anchor);
    return out;
  }
  if (rep === 'tydne') {
    let d = new Date(anchor);
    if (d < from) d = addDays(d, Math.ceil(diffDays(from, d) / 7) * 7);
    for (; d <= to; d = addDays(d, 7)) if (d >= from && d >= anchor && !hol.has(ymd(d))) out.push(timeOf(d));
    return out;
  }
  // měsíční varianty
  const wd = isoWeekday(anchor);
  let y = anchor.getFullYear(), m = anchor.getMonth();
  for (let i = 0; i < 400; i++) {
    let d;
    if (rep === 'mesicne') {
      d = new Date(y, m, Math.min(anchor.getDate(), daysInMonth(y, m)));
    } else {
      d = new Date(y, m, daysInMonth(y, m));
      while (isoWeekday(d) !== wd) d = addDays(d, -1);
    }
    const shifted = shiftBack(d);
    if (shifted > to) break;
    // celý zbytek měsíce jsou prázdniny (léto) → tenhle měsíc se vynechá
    if (shifted.getMonth() === m && shifted >= from && shifted >= startOfDay(anchor)) out.push(shifted);
    m++; if (m > 11) { m = 0; y++; }
  }
  return out;
}

/* ---------- lidé a příjemci ---------- */

export function personRoles(p) {
  const r = new Set(p.roles || []);
  if (p.tridnictvi) r.add('tridni');
  if (p.zastupce) r.add('zastupce');
  return r;
}
export function matchesTarget(p, t) {
  const r = personRoles(p);
  if (t === 'zamestnanci') return true;
  if (t === 'vsichni') return r.has('ucitel') || r.has('asistent') || r.has('vedeni');
  return r.has(t);
}

/** Map email → jméno všech, kterým úkol patří. */
export function recipientsOf(task, people) {
  const out = new Map();
  const nameOf = (e) => (people.find((p) => p.email === e)?.jmeno) || e;
  if (task.typ === 'osobni') {
    out.set(task.zadal, task.zadalJmeno || nameOf(task.zadal));
    return out;
  }
  for (const e of task.cile?.lide || []) { const em = e.toLowerCase(); out.set(em, nameOf(em)); }
  if (task.typ === 'plosny') {
    for (const t of task.cile?.role || []) {
      for (const p of people) if (p.aktivni !== false && matchesTarget(p, t)) out.set(p.email, p.jmeno);
    }
  }
  return out;
}

export const canBroadcast = (me) => me.roles.has('vedeni') || me.roles.has('spravce');

/* ---------- rozpis úkolů na konkrétní přiřazení ---------- */

export const HORIZON_DAYS = 21; // na kolik dní dopředu se úkoly rozepisují lidem

export function assignmentKey(taskId, vyskyt, email) {
  return `${taskId}|${vyskyt}|${email}`;
}

export function buildAssignment(task, due, email, jmeno) {
  const vyskyt = task.opakovani ? ymd(due) : 'jednou';
  const zobrazitOd = startOfDay(addDays(due, -(+task.zobrazitDni || 0)));
  return {
    ukolId: task.id,
    vyskyt,
    klic: assignmentKey(task.id, vyskyt, email),
    osoba: email,
    osobaJmeno: jmeno,
    nazev: task.nazev,
    popis: task.popis || '',
    priorita: task.priorita,
    termin: due.toISOString(),
    cas: task.cas || '',
    zobrazitOd: zobrazitOd.toISOString(),
    stitky: [...(task.stitky || [])],
    zadal: task.zadal,
    zadalJmeno: task.zadalJmeno,
    typ: task.typ,
    stav: 0,
    hotovo: null,
    poznamka: '',
    kontrolni: (task.kontrolni || []).map((t) => ({ t, done: false })),
    odkazy: (task.odkazy || []).map((l) => ({ ...l })),
    outlook: task.outlook !== false,
    outlookId: '',
  };
}

/**
 * Co je potřeba mít rozepsané (v okně od týdne zpátky po HORIZON dní dopředu).
 * Vrací Map klíč → přiřazení (nová, bez id).
 */
export function desiredAssignments(tasks, people, now = new Date(), hol = new Set()) {
  const today = startOfDay(now);
  const limit = addDays(today, HORIZON_DAYS);
  const want = new Map();
  for (const t of tasks) {
    if (t.aktivni === false) continue;
    const from = t.opakovani ? addDays(today, -7) : new Date(0);
    const to = addDays(limit, (+t.zobrazitDni || 0) + 1);
    const created = t.vytvoreno ? startOfDay(new Date(t.vytvoreno)) : new Date(0);
    let occ = occurrences(t, from, to, hol).filter((d) => addDays(startOfDay(d), -(+t.zobrazitDni || 0)) <= limit);
    if (t.opakovani) occ = occ.filter((d) => d >= created);
    else occ = occ.filter((d) => d >= addDays(today, -60)); // staré jednorázové už nevzkřísí
    const rec = recipientsOf(t, people);
    for (const d of occ) for (const [email, jmeno] of rec) {
      const a = buildAssignment(t, d, email, jmeno);
      want.set(a.klic, a);
    }
  }
  return want;
}

/** Porovná, co má být, s tím, co existuje. Smazat se smí jen nedokončené. */
export function reconcile(want, existing, onlyTaskIds = null) {
  const byKey = new Map();
  const dupes = [];
  for (const a of existing) {
    if (byKey.has(a.klic)) dupes.push(a); else byKey.set(a.klic, a);
  }
  const create = [];
  const update = [];
  const remove = [...dupes.filter((a) => a.stav < 2)];
  for (const [k, a] of want) {
    const ex = byKey.get(k);
    if (!ex) { create.push(a); continue; }
    const patch = {};
    for (const f of ['nazev', 'popis', 'priorita', 'termin', 'cas', 'zobrazitOd', 'typ']) if (ex[f] !== a[f]) patch[f] = a[f];
    if ((ex.stitky || []).join('|') !== a.stitky.join('|')) patch.stitky = a.stitky;
    // kroky ze zadání: nové se doplní, odebrané zmizí, odškrtnuté zůstanou odškrtnuté, vlastní kroky člověka zůstanou
    const merged = mergeChecklist(a.kontrolni.map((k) => k.t), ex.kontrolni || []);
    if (JSON.stringify(merged) !== JSON.stringify(ex.kontrolni || [])) patch.kontrolni = merged;
    const links = mergeLinks(a.odkazy, ex.odkazy || []);
    if (JSON.stringify(links) !== JSON.stringify(ex.odkazy || [])) patch.odkazy = links;
    if (Object.keys(patch).length) update.push({ id: ex.id, patch });
  }
  if (onlyTaskIds) {
    for (const ex of existing) {
      if (!onlyTaskIds.has(ex.ukolId) || ex.stav === 2) continue;
      if (!want.has(ex.klic) && new Date(ex.termin) >= addDays(startOfDay(new Date()), -7)) remove.push(ex);
    }
  }
  return { create, update, remove };
}

/**
 * Kroky ze zadání + stav odškrtnutí z přiřazení + vlastní kroky, které si člověk přidal sám.
 * Pořadí, které si člověk nastavil, zůstává; nové kroky ze zadání se přidají na konec.
 */
export function mergeChecklist(template, current) {
  const used = new Set();
  const out = [];
  for (const c of current) {
    if (c.own) { out.push(c); continue; }
    const i = template.findIndex((t, j) => !used.has(j) && t === c.t);
    if (i >= 0) { used.add(i); out.push({ t: c.t, done: !!c.done }); }
  }
  template.forEach((t, j) => { if (!used.has(j)) out.push({ t, done: false }); });
  return out;
}

export const linkKey = (l) => l.u || `soubor:${l.n}`;
/** Odkazy ze zadání + vlastní odkazy člověka; údaje (název, sdílení) bere ze zadání. */
export function mergeLinks(template, current) {
  const tk = new Map(template.map((t) => [linkKey(t), t]));
  const out = [];
  const seen = new Set();
  for (const c of current) {
    if (c.own) { out.push(c); continue; }
    const t = tk.get(linkKey(c));
    if (t && !seen.has(linkKey(t))) { out.push({ ...t }); seen.add(linkKey(t)); }
  }
  for (const t of template) if (!seen.has(linkKey(t))) out.push({ ...t });
  return out;
}

/* ---------- navržený termín podle rychlosti ---------- */
/**
 * Gepard = do zítra (pracovní den), Zajíc = do konce týdne (pátek),
 * Šnek = do konce měsíce (poslední pracovní den). Volna a svátky se přeskakují.
 */
export function suggestDue(priorita, now = new Date(), hol = new Set()) {
  const today = startOfDay(now);
  const back = (d) => { let x = d; let g = 0; while (isOff(x, hol) && g++ < 40) x = addDays(x, -1); return x; };
  const fwd = (d) => { let x = d; let g = 0; while (isOff(x, hol) && g++ < 40) x = addDays(x, 1); return x; };
  if (priorita === 'gepard') return fwd(addDays(today, 1));
  if (priorita === 'zajic') {
    let fri = addDays(startOfWeek(today), 4);
    if (fri <= today) fri = addDays(fri, 7);
    const d = back(fri);
    return d <= today ? fwd(addDays(today, 1)) : d;
  }
  let end = back(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  if (diffDays(end, today) < 3) end = back(new Date(today.getFullYear(), today.getMonth() + 2, 0));
  return end;
}

/* ---------- třídění a seskupení pro „Moje“ ---------- */

export function sortAssignments(list) {
  return [...list].sort((a, b) =>
    new Date(a.termin) - new Date(b.termin) ||
    (PRIORITY[b.priorita]?.n || 0) - (PRIORITY[a.priorita]?.n || 0) ||
    a.nazev.localeCompare(b.nazev, 'cs'));
}

export function groupForFeed(list, now = new Date()) {
  const today = startOfDay(now);
  const endWeek = addDays(startOfWeek(today), 7);
  const endNext = addDays(endWeek, 7);
  const g = { late: [], today: [], week: [], next: [], later: [] };
  for (const a of sortAssignments(list)) {
    const d = new Date(a.termin);
    if (d < now && diffDays(d, today) < 0) g.late.push(a);
    else if (diffDays(d, today) === 0) g.today.push(a);
    else if (d < endWeek) g.week.push(a);
    else if (d < endNext) g.next.push(a);
    else g.later.push(a);
  }
  return g;
}

/* ---------- .ics pro ruční přidání do kalendáře ---------- */

export function toIcs(items) {
  const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const stamp = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const day = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ukolnicek ucitele//CS', 'CALSCALE:GREGORIAN'];
  for (const a of items) {
    const d = new Date(a.termin);
    lines.push('BEGIN:VEVENT', `UID:${(a.klic || a.id || Math.random()).toString().replace(/[^\w|@.-]/g, '')}@ukolnicek`, `DTSTAMP:${stamp(new Date())}`);
    if (a.cas) {
      lines.push(`DTSTART;TZID=Europe/Prague:${stamp(d)}`, `DTEND;TZID=Europe/Prague:${stamp(new Date(d.getTime() + 15 * 60000))}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${day(d)}`, `DTEND;VALUE=DATE:${day(addDays(d, 1))}`);
    }
    lines.push(`SUMMARY:${esc(`${PRIORITY[a.priorita]?.label || ''} – ${a.nazev}`)}`, `DESCRIPTION:${esc(a.popis)}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(a.nazev)}`, `TRIGGER:-PT${reminderMinutes(a)}M`, 'END:VALARM', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/** Připomínka v Outlooku: ráno v 7:30 den před termínem. Vrací minuty před začátkem události. */
export function reminderMinutes(a) {
  const d = new Date(a.termin);
  const start = a.cas ? d : startOfDay(d);
  const target = addDays(startOfDay(d), -1);
  target.setHours(7, 30, 0, 0);
  return Math.max(0, Math.round((start - target) / 60000));
}
