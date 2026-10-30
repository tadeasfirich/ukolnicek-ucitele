// Ukázkový režim: všechna data v prohlížeči (localStorage). Stejné rozhraní jako store-sp.js.
import { parseCsv, tasksFromCsv, eventsFromCsv } from './csv.js';
import { ymd, addDays, startOfDay } from './core.js';

const KEY = 'ukolnicek-demo-v1';
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const DEMO_PEOPLE = [
  { email: 'tadeas@skola.example', jmeno: 'Tadeáš Firich', roles: ['spravce', 'ucitel'], tridnictvi: '', zastupce: '7.A' },
  { email: 'reditel@skola.example', jmeno: 'Jana Nováková', roles: ['vedeni', 'ucitel'], tridnictvi: '', zastupce: '' },
  { email: 'svoboda@skola.example', jmeno: 'Petr Svoboda', roles: ['ucitel'], tridnictvi: '7.A', zastupce: '' },
  { email: 'vesela@skola.example', jmeno: 'Lucie Veselá', roles: ['ucitel'], tridnictvi: '4.B', zastupce: '' },
  { email: 'kral@skola.example', jmeno: 'Martin Král', roles: ['ucitel'], tridnictvi: '', zastupce: '4.B' },
  { email: 'dvorakova@skola.example', jmeno: 'Eva Dvořáková', roles: ['asistent'], tridnictvi: '', zastupce: '' },
  { email: 'bara@skola.example', jmeno: 'Bára Černá', roles: ['provoz'], tridnictvi: '', zastupce: '' },
  { email: 'jidelna@skola.example', jmeno: 'Hana Malá', roles: ['provoz'], tridnictvi: '', zastupce: '' },
].map((p) => ({ ...p, id: p.email, aktivni: true }));

function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } }
function save(db) { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* plná paměť / soukromé okno */ } }

async function fetchText(url) {
  try { const r = await fetch(url, { cache: 'no-store' }); return r.ok ? await r.text() : ''; } catch { return ''; }
}

async function seed() {
  const me = DEMO_PEOPLE[0];
  const db = { meEmail: me.email, people: DEMO_PEOPLE, tasks: [], assignments: [], events: [], seededAt: new Date().toISOString() };
  const ev = eventsFromCsv(parseCsv(await fetchText('data/akce-2026-27.csv'))).events;
  db.events = ev.map((e) => ({ ...e, id: uid() }));
  const created = addDays(new Date(), -40).toISOString();
  const imported = tasksFromCsv(parseCsv(await fetchText('data/ukoly-navrh-2026-27.csv')), me).tasks;
  db.tasks = imported.map((t) => ({ ...t, id: uid(), vytvoreno: created }));

  // pár úkolů „ze života“, aby bylo hned co zkoušet
  const today = startOfDay(new Date());
  const d = (n) => ymd(addDays(today, n));
  const vedeni = DEMO_PEOPLE[1];
  const sample = [
    { nazev: 'Opravit písemky 7.A', popis: 'Lineární rovnice – 24 písemek.', termin: d(1), cas: '07:30', priorita: 'gepard', typ: 'osobni', cile: {}, stitky: ['Klasifikace'], zobrazitDni: 3,
      plan: 'Po poslední hodině v kabinetu, než půjdu domů.', kontrolni: ['Opravit', 'Zapsat do Školy OnLine', 'Rozdat zpět'] },
    { nazev: 'Poslat fotky z teambuildingu na web', popis: 'Stačí 5–10 fotek, bez tváří žáků bez souhlasu.', termin: d(3), cas: '', priorita: 'zajic', typ: 'prirazeny',
      cile: { lide: [me.email] }, stitky: ['Web'], zobrazitDni: 7, zadal: vedeni.email, zadalJmeno: vedeni.jmeno },
    { nazev: 'Objednat tonery do sborovny', popis: '', termin: d(-1), cas: '', priorita: 'snek', typ: 'osobni', cile: {}, stitky: [], zobrazitDni: 7 },
    { nazev: 'Připravit stanoviště na Den otevřených dveří', popis: 'Informatika + matematika, učebna 21.', termin: '2027-02-03', cas: '', priorita: 'zajic', typ: 'spolecny',
      cile: { lide: [me.email, 'svoboda@skola.example'] }, stitky: ['Akce'], zobrazitDni: 120, kontrolni: ['Nápad stanoviště', 'Pomůcky', 'Cedulky'] },
    { nazev: 'Nahrát materiál na Učitelnici', popis: '', termin: d(9), cas: '', priorita: 'snek', typ: 'osobni', cile: {}, stitky: ['Osobní'], zobrazitDni: 14 },
    { nazev: 'Zkontrolovat zálohu školního webu', popis: '', termin: d(-4), cas: '', priorita: 'zajic', typ: 'osobni', cile: {}, stitky: ['IT'], zobrazitDni: 7 },
  ];
  for (const s of sample) {
    db.tasks.push({ zadal: me.email, zadalJmeno: me.jmeno, opakovani: '', outlook: true, aktivni: true, zdroj: 'Ukázka', kontrolni: [], plan: '', ...s, id: uid(), vytvoreno: created });
  }
  db.flags = { demoStates: true };
  save(db);
  return db;
}

export async function createDemoStore() {
  let db = load();
  if (!db) db = await seed();
  const persist = () => save(db);
  const withRoles = (p) => ({ ...p, roles: new Set(p.roles || []) });

  const store = {
    mode: 'demo',
    needsLogin: false,
    async me() {
      const p = db.people.find((x) => x.email === db.meEmail) || db.people[0];
      return withRoles(p);
    },
    async people() { return db.people.map((p) => ({ ...p })); },
    async savePerson(p) {
      const i = db.people.findIndex((x) => x.id === p.id);
      const clean = { ...p, email: p.email.toLowerCase(), roles: [...(p.roles || [])], id: p.id || p.email.toLowerCase() };
      if (i >= 0) db.people[i] = clean; else db.people.push(clean);
      persist();
      return clean;
    },
    async tasks() { return db.tasks.map((t) => structuredClone(t)); },
    async saveTask(t) {
      const c = structuredClone(t);
      if (!c.id) { c.id = uid(); c.vytvoreno = new Date().toISOString(); db.tasks.push(c); }
      else { const i = db.tasks.findIndex((x) => x.id === c.id); if (i >= 0) db.tasks[i] = c; else db.tasks.push(c); }
      persist();
      return structuredClone(c);
    },
    async deleteTask(id) { db.tasks = db.tasks.filter((t) => t.id !== id); persist(); },
    async assignments(f = {}) {
      return db.assignments.filter((a) =>
        (!f.osoba || a.osoba === f.osoba) &&
        (!f.zadal || a.zadal === f.zadal) &&
        (!f.typ || a.typ === f.typ) &&
        (!f.ukolId || a.ukolId === f.ukolId) &&
        (!f.fromTermin || new Date(a.termin) >= f.fromTermin)).map((a) => structuredClone(a));
    },
    async createAssignments(list) {
      const out = list.map((a) => ({ ...structuredClone(a), id: uid() }));
      db.assignments.push(...out);
      persist();
      return out;
    },
    async updateAssignments(list) {
      for (const { id, patch } of list) {
        const a = db.assignments.find((x) => x.id === id);
        if (a) Object.assign(a, structuredClone(patch));
      }
      persist();
    },
    async deleteAssignments(ids) { const s = new Set(ids); db.assignments = db.assignments.filter((a) => !s.has(a.id)); persist(); },
    async events() { return db.events.map((e) => ({ ...e })); },
    async addEvents(list) { db.events.push(...list.map((e) => ({ ...e, id: uid() }))); persist(); },
    async deleteEvents(ids) { const s = new Set(ids); db.events = db.events.filter((e) => !s.has(e.id)); persist(); },

    // jen ukázka
    async switchUser(email) { db.meEmail = email; persist(); },
    async reset() { localStorage.removeItem(KEY); },
    exportAll() { return structuredClone(db); },
    get flags() { return db.flags || {}; },
    setFlag(k, v) { db.flags = { ...(db.flags || {}), [k]: v }; persist(); },
  };
  return store;
}
