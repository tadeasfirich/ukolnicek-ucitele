// Úkolníček – uživatelské rozhraní.
import * as C from './core.js';
import { parseCsv, tasksFromCsv, eventsFromCsv, toCsv } from './csv.js';

const cfg = window.UKOLNICEK_CONFIG || { mode: 'demo' };
const VERSION = '1.0.0';
const $app = document.getElementById('app');

const S = {
  store: null, me: null, people: [], tasks: [], events: [], mine: [], hol: new Set(),
  view: 'moje', filter: 'vse', laterOpen: false, cal: null, search: '',
  zadane: null, zadaneMode: 'moje', admin: 'lide', busy: 0, error: '', importPreview: null,
  installEvt: null,
};

/* ---------- drobnosti ---------- */
const h = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pref = {
  get(k, d) { try { const v = localStorage.getItem(`ku-${k}`); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(`ku-${k}`, JSON.stringify(v)); } catch { /* nic */ } },
};
const initials = (n) => (n || '?').split(/\s+/).filter((w) => /^\p{L}/u.test(w)).slice(0, 2).map((x) => x[0]).join('').toUpperCase() || '?';
const short = (n) => { const p = (n || '').split(' ').filter((w) => /^\p{L}/u.test(w)); return p.length > 1 ? `${p[0]} ${p[1][0]}.` : (p[0] || n); };
const plural = C.plural;
const MONTHS_GEN = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];

const I = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2"/><circle cx="4.5" cy="12" r="1.2"/><circle cx="4.5" cy="18" r="1.2"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="1.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  send: '<path d="M4 12h12M11 6l6 6-6 6"/><path d="M20 4v16"/>',
  done: '<rect x="3.5" y="4" width="17" height="16" rx="1.5"/><path d="M8 12.5l3 3 5-6"/>',
  user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.3-3.8 4.2-5.6 7.5-5.6s6.2 1.8 7.5 5.6"/>',
  cog: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M5.5 18.5l1.8-1.8M16.7 7.3l1.8-1.8"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',
  trash: '<path d="M5 7h14M9 7V4.5h6V7M7 7l1 13h8l1-13"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="1.5"/><path d="M4 7l8 6 8-6"/>',
  dl: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  up: '<path d="M12 16V5M7 10l5-5 5 5M5 20h14"/>',
  people: '<circle cx="9" cy="9" r="3.2"/><path d="M3 19c.9-3 3.2-4.6 6-4.6s5.1 1.6 6 4.6"/><circle cx="17" cy="8" r="2.5"/><path d="M16 13.6c2.4 0 4.2 1.4 5 3.9"/>',
  shield: '<path d="M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6L12 3z"/>',
  undo: '<path d="M8 6L3.5 10.5 8 15"/><path d="M4 10.5h10a5.5 5.5 0 010 11h-3"/>',
  bell: '<path d="M6 16.5V11a6 6 0 1112 0v5.5l1.5 2h-15l1.5-2z"/><path d="M10 20.5a2 2 0 004 0"/>',
};
const icon = (n, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;

function statusIcon(stav) {
  if (stav === 2) return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" class="s-fill"/><path d="M7.5 12.3l3 3 6-6.6" class="s-check"/></svg>';
  if (stav === 1) return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" class="s-ring"/><path d="M12 3a9 9 0 010 18z" class="s-half"/></svg>';
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" class="s-ring"/></svg>';
}
function chevrons(n) {
  let p = '';
  for (let i = 0; i < n; i++) p += `<path d="M${2 + i * 5} 3l4 5-4 5"/>`;
  return `<svg class="chev" viewBox="0 0 ${6 + (n - 1) * 5 + 2} 16" aria-hidden="true">${p}</svg>`;
}
const priPill = (p) => `<span class="pri pri-${p}">${chevrons(C.PRIORITY[p]?.n || 1)}${h(C.PRIORITY[p]?.label || p)}</span>`;

/* ---------- start ---------- */

async function boot() {
  applyTheme();
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); S.installEvt = e; });
  try {
    if (cfg.mode === 'sharepoint') {
      renderSplash('Přihlašuji…');
      const { createSpStore } = await import('./store-sp.js');
      S.store = await createSpStore(cfg);
      if (S.store.needsLogin) return renderLogin();
    } else {
      const { createDemoStore } = await import('./store-demo.js');
      S.store = await createDemoStore();
    }
    renderSplash('Načítám úkoly…');
    S.me = await S.store.me();
    if (!S.me.roles.size) return renderBlocked();
    await loadAll();
    await materialize({});
    if (S.store.mode === 'demo' && S.store.flags.demoStates) await applyDemoStates();
    S.view = (location.hash || '#moje').slice(1) || 'moje';
    render();
    syncOutlookSoon();
  } catch (e) {
    console.error(e);
    renderFatal(e);
  }
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

async function loadAll() {
  const [people, tasks, events, mine] = await Promise.all([
    S.store.people(), S.store.tasks(), S.store.events(), S.store.assignments({ osoba: S.me.email }),
  ]);
  S.people = people; S.tasks = tasks; S.events = events; S.mine = mine;
  S.hol = C.holidaySet(events);
  S.zadane = null;
}
async function reloadMine() { S.mine = await S.store.assignments({ osoba: S.me.email }); S.zadane = null; }

/**
 * Rozepíše úkoly konkrétním lidem (plošné podle rolí, opakované dopředu).
 * Celé škole jednou denně (kdokoli otevře appku), konkrétní úkol hned po uložení.
 */
async function materialize({ force = false, taskIds = null }) {
  const today = C.ymd(new Date());
  if (!taskIds && !force && S.store.mode !== 'demo' && pref.get('lastMaterialize', '') === today) return;
  busy(1);
  try {
    const tasks = taskIds ? S.tasks.filter((t) => taskIds.has(t.id)) : S.tasks;
    const want = C.desiredAssignments(tasks, S.people, new Date(), S.hol);
    let existing;
    if (taskIds) existing = (await Promise.all([...taskIds].map((id) => S.store.assignments({ ukolId: id })))).flat();
    else existing = await S.store.assignments({ fromTermin: C.addDays(C.startOfDay(new Date()), -8) });
    const ids = taskIds || new Set(S.tasks.filter((t) => t.aktivni !== false).map((t) => t.id));
    const { create, update, remove } = C.reconcile(want, existing, ids);
    await S.store.createAssignments(create);
    await S.store.updateAssignments(update);
    await S.store.deleteAssignments(remove.map((a) => a.id));
    if (!taskIds) pref.set('lastMaterialize', today);
    if (create.length || update.length || remove.length) await reloadMine();
  } finally { busy(-1); }
}

async function applyDemoStates() {
  const find = (n) => S.mine.find((a) => a.nazev === n);
  const p = find('Opravit písemky 7.A');
  const z = find('Zkontrolovat zálohu školního webu');
  const upd = [];
  if (p) upd.push({ id: p.id, patch: { stav: 1, kontrolni: p.kontrolni.map((k, i) => ({ ...k, done: i === 0 })) } });
  if (z) upd.push({ id: z.id, patch: { stav: 2, hotovo: C.addDays(new Date(), -1).toISOString() } });
  await S.store.updateAssignments(upd);
  S.store.setFlag('demoStates', false);
  await reloadMine();
}

let outlookTimer = null;
function syncOutlookSoon(delay = 1500) {
  if (S.store?.mode !== 'sharepoint' || !pref.get('outlook', true)) return;
  clearTimeout(outlookTimer);
  outlookTimer = setTimeout(async () => {
    try { await S.store.syncOutlook(S.mine); await reloadMine(); } catch (e) { console.warn('Outlook', e); }
  }, delay);
}

function busy(d) { S.busy += d; document.body.classList.toggle('is-busy', S.busy > 0); }

/* ---------- vykreslení ---------- */

const VIEWS = {
  moje: { title: 'Moje úkoly', nav: 'Moje', icon: 'list' },
  kalendar: { title: 'Kalendář', nav: 'Kalendář', icon: 'cal' },
  zadane: { title: 'Zadané', nav: 'Zadané', icon: 'send' },
  hotove: { title: 'Hotové', nav: 'Hotové', icon: 'done' },
  nastaveni: { title: 'Nastavení', icon: 'cog' },
  sprava: { title: 'Správa', icon: 'shield' },
};

function render() {
  if (!VIEWS[S.view]) S.view = 'moje';
  if (S.view === 'sprava' && !S.me.roles.has('spravce')) S.view = 'moje';
  const v = VIEWS[S.view];
  const body = { moje: viewMoje, kalendar: viewKalendar, zadane: viewZadane, hotove: viewHotove, nastaveni: viewNastaveni, sprava: viewSprava }[S.view]();
  $app.innerHTML = `
    <header class="top">
      <div class="top-in">
        <div>
          <div class="eyebrow">${h(cfg.schoolShort || 'Úkolníček')}</div>
          <h1>${h(v.title)}</h1>
        </div>
        <div class="top-actions">
          ${S.me.roles.has('spravce') ? `<a class="iconbtn ${S.view === 'sprava' ? 'on' : ''}" href="#sprava" aria-label="Správa">${icon('shield')}</a>` : ''}
          <a class="avatar ${S.view === 'nastaveni' ? 'on' : ''}" href="#nastaveni" aria-label="Nastavení a můj účet">${h(initials(S.me.jmeno))}</a>
        </div>
      </div>
      <div class="busybar"></div>
    </header>
    ${S.store.mode === 'demo' ? `<div class="demo-band">Ukázkový režim – data jsou jen v tomto prohlížeči. <a href="#nastaveni">Vyzkoušet jako jiná role</a></div>` : ''}
    ${S.error ? `<div class="errband" role="alert">${h(S.error)} <button data-act="dismiss-error">Zavřít</button></div>` : ''}
    <main class="main">${body}</main>
    <nav class="nav" aria-label="Hlavní menu">
      ${navItem('moje')}${navItem('kalendar')}
      <button class="fab" data-act="new" aria-label="Nový úkol">${icon('plus')}<span>Nový</span></button>
      ${navItem('zadane')}${navItem('hotove')}
    </nav>
    <div class="toasts" id="toasts" aria-live="polite"></div>`;
  if (S.view === 'sprava' && S.admin === 'napojeni' && S.store.listStatus) refreshListStatus();
}
function navItem(k) {
  const v = VIEWS[k];
  const badge = k === 'moje' ? visibleOpen().filter((a) => new Date(a.termin) < C.addDays(C.startOfDay(new Date()), 1)).length : 0;
  return `<a href="#${k}" class="nav-i ${S.view === k ? 'on' : ''}" ${S.view === k ? 'aria-current="page"' : ''}>${icon(v.icon)}<span>${v.nav}</span>${badge ? `<b class="badge">${badge}</b>` : ''}</a>`;
}

function renderSplash(msg) {
  $app.innerHTML = `<div class="splash"><div class="logo">${logoSvg()}</div><div class="eyebrow">Úkolníček</div><p>${h(msg)}</p></div>`;
}
function renderLogin() {
  $app.innerHTML = `<div class="splash">
    <div class="logo">${logoSvg()}</div>
    <div class="eyebrow">${h(cfg.schoolName || 'Škola')}</div>
    <h1 class="splash-title">Úkolníček</h1>
    <p>Co je potřeba udělat, a kdy. Pro učitele, asistenty, vedení i provoz.</p>
    <button class="btn primary big" data-act="login">Přihlásit přes Microsoft 365</button>
    <p class="muted small">Použij svůj školní účet.</p>
  </div>`;
}
function renderBlocked() {
  $app.innerHTML = `<div class="splash"><div class="logo">${logoSvg()}</div>
    <h1 class="splash-title">Sem nemáš přístup</h1>
    <p>Úkolníček je pro zaměstnance školy. Pokud jím jsi, napiš správci – přidá tě do správné skupiny.</p>
    <p class="muted small">${h(S.me.email)}</p>
    ${S.store.logout ? '<button class="btn" data-act="logout">Odhlásit</button>' : ''}</div>`;
}
function renderFatal(e) {
  const missing = e.code === 'missingList';
  $app.innerHTML = `<div class="splash"><div class="logo">${logoSvg()}</div>
    <h1 class="splash-title">${missing ? 'Ještě to není nachystané' : 'Něco se pokazilo'}</h1>
    <p>${h(e.message || e)}</p>
    ${missing && S.me?.roles.has('spravce') ? '<button class="btn primary" data-act="create-lists-boot">Vytvořit seznamy teď</button>' : ''}
    <button class="btn" data-act="reload">Zkusit znovu</button></div>`;
}
const logoSvg = () => '<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="12" fill="#2A4B9B"/><circle cx="32" cy="32" r="19" fill="none" stroke="#fff" stroke-width="4.5"/><path d="M23 32.5l6.5 6.5L42 26" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* ---------- Moje ---------- */

const visibleOpen = () => S.mine.filter((a) => a.stav < 2 && new Date(a.zobrazitOd) <= new Date());

function viewMoje() {
  const now = new Date();
  const open = visibleOpen();
  const hidden = S.mine.filter((a) => a.stav < 2 && new Date(a.zobrazitOd) > now).length;
  const tags = [...new Set(open.flatMap((a) => a.stitky || []))].sort((a, b) => a.localeCompare(b, 'cs'));
  let list = open;
  if (S.filter === 'gepard') list = open.filter((a) => a.priorita === 'gepard');
  else if (S.filter.startsWith('tag:')) list = open.filter((a) => (a.stitky || []).includes(S.filter.slice(4)));

  const g = C.groupForFeed(list, now);
  const hour = now.getHours();
  const hello = hour < 10 ? 'Dobré ráno' : hour < 18 ? 'Dobrý den' : 'Dobrý večer';

  // týdenní pokrok (malé výhry viditelně)
  const ws = C.startOfWeek(now), we = C.addDays(ws, 7);
  const doneW = S.mine.filter((a) => a.stav === 2 && a.hotovo && new Date(a.hotovo) >= ws).length;
  const openW = open.filter((a) => new Date(a.termin) < we).length;
  const tot = doneW + openW;

  const section = (key, title, items, opts = {}) => {
    if (!items.length) return '';
    const collapsed = opts.collapsible && !S.laterOpen;
    return `<section class="sec sec-${key}">
      <h2 class="sec-h">${title}<span class="cnt">${items.length}</span>
        ${opts.collapsible ? `<button class="linkbtn" data-act="toggle-later">${collapsed ? 'Ukázat' : 'Schovat'}</button>` : ''}</h2>
      ${collapsed ? '' : items.map(card).join('')}
    </section>`;
  };

  const intro = pref.get('introDone', false) ? '' : `
    <div class="intro">
      <div class="eyebrow">Jak na to – 3 kroky</div>
      <ol>
        <li><b>Tady vidíš, co máš udělat.</b> Nahoře to, co hoří.</li>
        <li><b>Ťukni na kolečko</b>, když začneš. Ťukni znovu, když je hotovo – úkol se schová do Hotových.</li>
        <li><b>Nový úkol</b> přidáš velkým plusem dole.</li>
      </ol>
      <button class="btn small" data-act="intro-done">Rozumím</button>
    </div>`;

  return `
    <div class="hello"><div class="hello-l"><b>${hello}.</b>
      <span class="muted">${C.fmtWeekday(now, true)} ${now.getDate()}. ${MONTHS_GEN[now.getMonth()]}</span></div></div>
    ${tot ? `<div class="week">
      <div class="week-t"><span class="eyebrow">Tento týden</span><b>hotovo ${doneW} z ${tot}</b></div>
      <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${tot}" aria-valuenow="${doneW}"><i style="width:${Math.round(doneW / tot * 100)}%"></i></div>
    </div>` : ''}
    ${intro}
    ${open.length ? `<div class="chips" role="group" aria-label="Filtr">
      <button class="chip ${S.filter === 'vse' ? 'on' : ''}" data-act="filter" data-v="vse">Vše <span>${open.length}</span></button>
      <button class="chip ${S.filter === 'gepard' ? 'on' : ''}" data-act="filter" data-v="gepard">${chevrons(3)}Gepard <span>${open.filter((a) => a.priorita === 'gepard').length}</span></button>
      ${tags.map((t) => `<button class="chip ${S.filter === `tag:${t}` ? 'on' : ''}" data-act="filter" data-v="tag:${h(t)}">${h(t)}</button>`).join('')}
    </div>` : ''}
    ${section('late', 'Po termínu', g.late)}
    ${section('today', 'Dnes', g.today)}
    ${section('week', 'Tento týden', g.week)}
    ${section('next', 'Příští týden', g.next)}
    ${section('later', 'Později', g.later, { collapsible: true })}
    ${!list.length ? `<div class="empty"><div class="empty-ico">${statusIcon(2)}</div>
      <b>${open.length ? 'V tomhle filtru nic není.' : 'Nic tě netlačí.'}</b>
      <p class="muted">${open.length ? '' : 'Všechno, co je teď na řadě, máš hotové.'}</p></div>` : ''}
    ${hidden ? `<a class="upcoming" href="#kalendar">${icon('cal')}<span><b>${hidden} ${plural(hidden, 'úkol se objeví', 'úkoly se objeví', 'úkolů se objeví')} později</b>
      <span class="muted">Až přijde jejich čas. Dopředu je uvidíš v Kalendáři.</span></span>${icon('next')}</a>` : ''}
  `;
}

function card(a) {
  const due = C.fmtDue(a.termin, a.cas);
  const chk = a.kontrolni?.length ? `${a.kontrolni.filter((k) => k.done).length}/${a.kontrolni.length}` : '';
  const from = a.zadal && a.zadal !== S.me.email ? `od ${short(a.zadalJmeno || a.zadal)}` : '';
  const next = C.STATUS[Math.min(2, a.stav + 1)].label;
  return `<article class="card st-${a.stav} tone-${due.tone || 'x'}">
    <button class="st" data-act="cycle" data-id="${a.id}" aria-label="Stav: ${C.STATUS[a.stav].label}. Ťukni pro: ${next}">${statusIcon(a.stav)}</button>
    <button class="card-b" data-act="open" data-id="${a.id}">
      <span class="card-t">${h(a.nazev)}</span>
      <span class="card-m">
        ${priPill(a.priorita)}
        <span class="due due-${due.tone || 'x'}">${h(due.text)}</span>
        ${a.stav === 1 ? '<span class="stlabel">rozpracováno</span>' : ''}
        ${chk ? `<span class="meta">${chk}</span>` : ''}
        ${a.typ === 'spolecny' ? `<span class="meta">${icon('people', 'xs')}společný</span>` : ''}
        ${from ? `<span class="meta">${h(from)}</span>` : ''}
        ${(a.stitky || []).slice(0, 2).map((t) => `<span class="tag">${h(t)}</span>`).join('')}
      </span>
    </button>
  </article>`;
}

/* ---------- Kalendář ---------- */

function myCalendarItems(from, to) {
  const out = new Map();
  for (const a of S.mine) {
    const d = new Date(a.termin);
    if (d >= from && d < to) out.set(a.klic, a);
  }
  // dopředu dopočítané výskyty (ještě nerozepsané)
  for (const t of S.tasks) {
    if (t.aktivni === false) continue;
    const rec = C.recipientsOf(t, S.people);
    if (!rec.has(S.me.email)) continue;
    for (const d of C.occurrences(t, from, to, S.hol)) {
      const a = C.buildAssignment(t, d, S.me.email, S.me.jmeno);
      if (!out.has(a.klic)) out.set(a.klic, { ...a, virtual: true });
    }
  }
  return [...out.values()];
}

function viewKalendar() {
  const now = new Date();
  if (!S.cal) S.cal = { y: now.getFullYear(), m: now.getMonth(), sel: null };
  const { y, m } = S.cal;
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 1);
  const items = myCalendarItems(first, last);
  const evs = S.events.filter((e) => C.parseYmd(e.do || e.od) >= first && C.parseYmd(e.od) < last);

  const byDay = new Map();
  const add = (k, x) => { if (!byDay.has(k)) byDay.set(k, { ev: [], ta: [] }); byDay.get(k)[x.kind].push(x.v); };
  for (const e of evs) {
    let d = C.parseYmd(e.od); const end = C.parseYmd(e.do || e.od);
    const long = C.diffDays(end, d) > 6; // dlouhé (prázdniny) jen jako podbarvení
    const startT = C.parseYmd(e.od).getTime();
    while (d <= end) {
      // v mřížce značka každý den (dlouhé prázdniny jen podbarvením), v přehledu jen první den
      const head = d.getTime() === startT || d.getDate() === 1;
      if (d >= first && d < last && (!long || head)) add(C.ymd(d), { kind: 'ev', v: head ? e : { ...e, cont: true } });
      d = C.addDays(d, 1);
    }
  }
  for (const a of items) add(C.ymd(new Date(a.termin)), { kind: 'ta', v: a });

  const offset = C.isoWeekday(first) - 1;
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push('<span class="cd empty"></span>');
  for (let d = 1; d <= C.daysInMonth(y, m); d++) {
    const date = new Date(y, m, d);
    const k = C.ymd(date);
    const x = byDay.get(k);
    const off = S.hol.has(k);
    const isToday = k === C.ymd(now);
    const marks = x ? `${x.ev.length ? '<i class="mk sq"></i>' : ''}${x.ta.some((a) => a.stav < 2) ? '<i class="mk ci"></i>' : ''}${x.ta.length && x.ta.every((a) => a.stav === 2) ? '<i class="mk ci done"></i>' : ''}` : '';
    cells.push(`<button class="cd ${off ? 'off' : ''} ${isToday ? 'today' : ''} ${S.cal.sel === k ? 'sel' : ''} ${C.isoWeekday(date) > 5 ? 'we' : ''}" data-act="cal-day" data-d="${k}" aria-label="${d}. ${m + 1}.${x ? `, ${x.ev.length} akcí, ${x.ta.length} úkolů` : ''}">
      <span class="dn">${d}</span><span class="mks">${marks}</span></button>`);
  }

  const days = [...byDay.keys()].sort().filter((k) => (!S.cal.sel || k === S.cal.sel) && (S.cal.sel || byDay.get(k).ta.length || byDay.get(k).ev.some((e) => !e.cont)));
  const agenda = days.map((k) => {
    const d = C.parseYmd(k);
    const x = byDay.get(k);
    return `<div class="ag-day ${k === C.ymd(now) ? 'is-today' : ''}">
      <div class="ag-d"><b>${d.getDate()}.</b><span>${C.fmtWeekday(d)}</span></div>
      <div class="ag-items">
        ${x.ev.filter((e) => !e.cont || S.cal.sel).map((e) => `<div class="ag-ev ev-${e.typ}"><i class="mk sq"></i><span>${h(e.nazev)}${e.cas ? ` <span class="muted">– ${h(e.cas)}</span>` : ''}${e.od !== e.do ? ` <span class="muted">(${C.fmtDate(C.parseYmd(e.od))}–${C.fmtDate(C.parseYmd(e.do))})</span>` : ''}</span></div>`).join('')}
        ${C.sortAssignments(x.ta).map((a) => `<button class="ag-ta st-${a.stav}" ${a.virtual ? '' : `data-act="open" data-id="${a.id}"`}>
          <span class="st sm">${statusIcon(a.stav)}</span><span class="ag-t">${h(a.nazev)}
          <span class="card-m">${priPill(a.priorita)}${a.cas ? `<span class="meta">${a.cas}</span>` : ''}${new Date(a.zobrazitOd) > now && a.stav < 2 ? `<span class="meta">${icon('bell', 'xs')}objeví se ${C.fmtDate(new Date(a.zobrazitOd))}</span>` : ''}</span></span></button>`).join('')}
      </div></div>`;
  }).join('');

  return `
    <div class="cal-head">
      <button class="iconbtn" data-act="cal-prev" aria-label="Předchozí měsíc">${icon('back')}</button>
      <h2>${C.MONTHS[m]} ${y}</h2>
      <button class="iconbtn" data-act="cal-next" aria-label="Další měsíc">${icon('next')}</button>
    </div>
    <div class="cal">
      ${['po', 'út', 'st', 'čt', 'pá', 'so', 'ne'].map((d) => `<span class="cw">${d}</span>`).join('')}
      ${cells.join('')}
    </div>
    <div class="legend"><span><i class="mk sq"></i>akce školy</span><span><i class="mk ci"></i>můj úkol</span><span><i class="mk ci done"></i>hotovo</span><span><i class="lg-off"></i>volno</span></div>
    ${S.cal.sel ? `<button class="linkbtn" data-act="cal-all">Ukázat celý měsíc</button>` : ''}
    <div class="agenda">${agenda || '<div class="empty"><b>Tento měsíc nic.</b></div>'}</div>
    ${(y !== now.getFullYear() || m !== now.getMonth()) ? '<button class="btn small center" data-act="cal-today">Zpět na dnešek</button>' : ''}`;
}

/* ---------- Zadané ---------- */

async function loadZadane() {
  busy(1);
  try {
    if (S.zadaneMode === 'plosne') S.zadane = await S.store.assignments({ typ: 'plosny' });
    else S.zadane = (await S.store.assignments({ zadal: S.me.email })).filter((a) => a.typ !== 'osobni');
  } finally { busy(-1); }
  if (S.view === 'zadane') render();
}

function groupsOfZadane() {
  const g = new Map();
  for (const a of S.zadane || []) {
    const k = `${a.ukolId}|${a.vyskyt}`;
    if (!g.has(k)) g.set(k, { k, ukolId: a.ukolId, vyskyt: a.vyskyt, nazev: a.nazev, priorita: a.priorita, termin: a.termin, cas: a.cas, typ: a.typ, zadalJmeno: a.zadalJmeno, zobrazitOd: a.zobrazitOd, items: [] });
    g.get(k).items.push(a);
  }
  return [...g.values()].sort((a, b) => new Date(a.termin) - new Date(b.termin));
}

function viewZadane() {
  if (!S.zadane) { loadZadane(); return '<div class="loading">Načítám…</div>'; }
  const groups = groupsOfZadane();
  const now = C.startOfDay(new Date());
  const active = groups.filter((g) => g.items.some((a) => a.stav < 2) || new Date(g.termin) >= C.addDays(now, -7));
  const old = groups.length - active.length;
  const canAll = C.canBroadcast(S.me);
  const taskOf = (id) => S.tasks.find((t) => t.id === id);
  return `
    ${canAll ? `<div class="seg" role="tablist">
      <button class="${S.zadaneMode === 'moje' ? 'on' : ''}" data-act="zad-mode" data-v="moje">Zadal(a) jsem</button>
      <button class="${S.zadaneMode === 'plosne' ? 'on' : ''}" data-act="zad-mode" data-v="plosne">Všechny plošné</button>
    </div>` : ''}
    <p class="muted lead">Úkoly, které jsi dal(a) kolegům. Uvidíš, kdo má hotovo a komu připomenout.</p>
    ${active.map((g) => {
      const done = g.items.filter((a) => a.stav === 2).length;
      const doing = g.items.filter((a) => a.stav === 1).length;
      const due = C.fmtDue(g.termin, g.cas);
      const t = taskOf(g.ukolId);
      const who = g.typ === 'plosny' ? (t?.cile?.role || []).map((r) => C.TARGETS[r]).join(', ') : g.items.map((a) => short(a.osobaJmeno)).join(', ');
      const pct = Math.round(done / g.items.length * 100);
      return `<button class="zcard" data-act="zad-open" data-k="${h(g.k)}">
        <span class="card-t">${h(g.nazev)}</span>
        <span class="card-m">${priPill(g.priorita)}<span class="due due-${done === g.items.length ? 'x' : due.tone || 'x'}">${h(due.text)}</span><span class="meta">${h(who)}</span>
          ${new Date(g.zobrazitOd) > new Date() ? `<span class="meta">${icon('bell', 'xs')}lidem se objeví ${C.fmtDate(new Date(g.zobrazitOd))}</span>` : ''}</span>
        <span class="zprog"><span class="bar"><i style="width:${pct}%"></i><i class="doing" style="width:${Math.round(doing / g.items.length * 100)}%"></i></span>
          <b>${done}/${g.items.length}</b></span>
      </button>`;
    }).join('') || `<div class="empty"><b>Zatím jsi nikomu nic nezadal(a).</b><p class="muted">Ťukni na plus a vyber „Pro kolegu“.</p></div>`}
    ${old ? `<p class="muted small center">${old} starších dokončených zadání je schováno.</p>` : ''}`;
}

/* ---------- Hotové ---------- */

function viewHotove() {
  const q = S.search.trim().toLowerCase();
  const done = S.mine.filter((a) => a.stav === 2 && (!q || a.nazev.toLowerCase().includes(q) || (a.stitky || []).some((t) => t.toLowerCase().includes(q))))
    .sort((a, b) => new Date(b.hotovo || b.termin) - new Date(a.hotovo || a.termin));
  const byMonth = new Map();
  for (const a of done) {
    const d = new Date(a.hotovo || a.termin);
    const k = `${C.MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    if (!byMonth.has(k)) byMonth.set(k, []);
    byMonth.get(k).push(a);
  }
  return `
    <label class="search">${icon('search')}<input type="search" placeholder="Hledat v hotových…" value="${h(S.search)}" data-act="search" aria-label="Hledat v hotových"></label>
    ${[...byMonth].map(([k, list]) => `<section class="sec"><h2 class="sec-h">${k}<span class="cnt">${list.length}</span></h2>
      ${list.map((a) => `<article class="card st-2">
        <span class="st">${statusIcon(2)}</span>
        <button class="card-b" data-act="open" data-id="${a.id}"><span class="card-t">${h(a.nazev)}</span>
          <span class="card-m"><span class="meta">hotovo ${a.hotovo ? C.fmtDate(new Date(a.hotovo)) : ''}</span>${priPill(a.priorita)}${(a.stitky || []).map((t) => `<span class="tag">${h(t)}</span>`).join('')}</span></button>
        <button class="linkbtn" data-act="reopen" data-id="${a.id}">Vrátit</button>
      </article>`).join('')}</section>`).join('') || `<div class="empty"><b>${q ? 'Nic nenalezeno.' : 'Tady se budou schovávat hotové úkoly.'}</b></div>`}`;
}

/* ---------- Nastavení ---------- */

function viewNastaveni() {
  const roles = [...S.me.roles].map((r) => `<span class="tag">${C.ROLE_LABELS[r]}${r === 'tridni' && S.me.tridnictvi ? ` ${h(S.me.tridnictvi)}` : ''}${r === 'zastupce' && S.me.zastupce ? ` ${h(S.me.zastupce)}` : ''}</span>`).join('');
  const theme = pref.get('theme', 'auto');
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = matchMedia('(display-mode: standalone)').matches;
  return `
    <section class="panel">
      <div class="me"><span class="avatar big">${h(initials(S.me.jmeno))}</span><div><b>${h(S.me.jmeno)}</b><div class="muted small">${h(S.me.email)}</div><div class="tags">${roles}</div></div></div>
    </section>
    ${S.store.mode === 'demo' ? `<section class="panel">
      <h3 class="eyebrow">Vyzkoušet jako</h3>
      <p class="muted small">Ukázka – přepni se do jiné role a podívej se, co ten člověk vidí.</p>
      <div class="people-pick">${S.people.map((p) => `<button class="pp ${p.email === S.me.email ? 'on' : ''}" data-act="demo-as" data-v="${h(p.email)}">
        <b>${h(p.jmeno)}</b><span class="muted small">${C.ROLE_LABELS[(p.roles || [])[0]] || ''}${p.tridnictvi ? `, třídní ${h(p.tridnictvi)}` : ''}${p.zastupce ? `, zástupce ${h(p.zastupce)}` : ''}</span></button>`).join('')}</div>
    </section>` : ''}
    <section class="panel">
      <h3 class="eyebrow">Připomínání</h3>
      ${S.store.mode === 'sharepoint'
        ? `<label class="switch"><input type="checkbox" data-act="pref-outlook" ${pref.get('outlook', true) ? 'checked' : ''}><span>Zapisovat moje úkoly do Outlook kalendáře<small class="muted">Upozornění přijde ráno v 7:30 den před termínem.</small></span></label>`
        : '<p class="muted small">V ostrém provozu se úkoly samy zapíšou do Outlook kalendáře. Teď si je můžeš stáhnout ručně:</p>'}
      <button class="btn" data-act="ics-all">${icon('dl')}Stáhnout moje termíny do kalendáře (.ics)</button>
    </section>
    <section class="panel">
      <h3 class="eyebrow">Vzhled</h3>
      <div class="seg">${[['auto', 'Podle telefonu'], ['light', 'Světlý'], ['dark', 'Tmavý']].map(([v, l]) => `<button class="${theme === v ? 'on' : ''}" data-act="theme" data-v="${v}">${l}</button>`).join('')}</div>
    </section>
    ${!standalone ? `<section class="panel">
      <h3 class="eyebrow">Mít po ruce</h3>
      ${S.installEvt ? '<button class="btn primary" data-act="install">Přidat na plochu</button>'
        : isIos ? '<p class="small">V Safari ťukni na <b>Sdílet</b> a pak <b>Přidat na plochu</b>.</p>'
        : '<p class="small">V Chromu otevři menu (tři tečky) a zvol <b>Přidat na plochu</b> nebo <b>Nainstalovat aplikaci</b>.</p>'}
    </section>` : ''}
    <section class="panel help">
      <h3 class="eyebrow">Jak to funguje</h3>
      <dl>
        <dt>${priPill('gepard')}</dt><dd>Hoří. Udělej co nejdřív.</dd>
        <dt>${priPill('zajic')}</dt><dd>Brzy. Tento nebo příští týden.</dd>
        <dt>${priPill('snek')}</dt><dd>Počká. Hlavně nezapomenout.</dd>
        <dt><span class="st sm st-0 inl">${statusIcon(0)}</span></dt><dd>Nezačato</dd>
        <dt><span class="st sm st-1 inl">${statusIcon(1)}</span></dt><dd>Rozpracováno</dd>
        <dt><span class="st sm st-2 inl">${statusIcon(2)}</span></dt><dd>Hotovo – schová se do Hotových</dd>
      </dl>
      <p class="small muted">Úkoly se ti ukážou, až přijde jejich čas – třeba výkaz až poslední týden v měsíci. Dopředu je najdeš v Kalendáři.</p>
      <button class="linkbtn" data-act="intro-again">Znovu ukázat úvodní nápovědu</button>
    </section>
    <section class="panel">
      ${S.store.logout ? '<button class="btn" data-act="logout">Odhlásit</button>' : ''}
      <p class="muted small">Úkolníček ${VERSION}${S.store.mode === 'demo' ? ' – ukázkový režim' : ''}</p>
    </section>`;
}

/* ---------- Správa ---------- */

function viewSprava() {
  const tabs = [['lide', 'Lidé a role'], ['import', 'Import'], ['napojeni', 'Napojení'], ['zaloha', 'Záloha']];
  const body = { lide: adminLide, import: adminImport, napojeni: adminNapojeni, zaloha: adminZaloha }[S.admin]();
  return `<div class="seg scroll" role="tablist">${tabs.map(([k, l]) => `<button class="${S.admin === k ? 'on' : ''}" data-act="admin-tab" data-v="${k}">${l}</button>`).join('')}</div>${body}`;
}

function adminLide() {
  const people = [...S.people].sort((a, b) => a.jmeno.localeCompare(b.jmeno, 'cs'));
  const counts = Object.keys(C.TARGETS).map((t) => `<span class="tag">${C.TARGETS[t]}: ${S.people.filter((p) => p.aktivni !== false && C.matchesTarget(p, t)).length}</span>`).join('');
  return `
    <p class="muted lead">Role učitel, asistent a vedení se berou ze skupin Microsoft 365. Třídnictví a zástupce nastavíš tady.</p>
    <div class="tags">${counts}</div>
    <div class="row-actions">
      ${S.store.syncPeopleFromGroups ? `<button class="btn" data-act="sync-groups">${icon('people')}Načíst lidi ze skupin M365</button>` : ''}
      <button class="btn" data-act="person-new">${icon('plus')}Přidat člověka</button>
    </div>
    <div class="plist">${people.map((p) => `<button class="prow ${p.aktivni === false ? 'inactive' : ''}" data-act="person-edit" data-id="${h(p.id)}">
      <span class="avatar">${h(initials(p.jmeno))}</span>
      <span><b>${h(p.jmeno)}</b><span class="muted small">${h(p.email)}</span>
      <span class="tags">${[...C.personRoles(p)].map((r) => `<span class="tag">${C.ROLE_LABELS[r]}${r === 'tridni' ? ` ${h(p.tridnictvi)}` : ''}${r === 'zastupce' ? ` ${h(p.zastupce)}` : ''}</span>`).join('')}${p.aktivni === false ? '<span class="tag warn">neaktivní</span>' : ''}</span></span>
    </button>`).join('')}</div>`;
}

function adminImport() {
  const pv = S.importPreview;
  return `
    <section class="panel">
      <h3 class="eyebrow">1 – Akce z harmonogramu</h3>
      <p class="small">CSV se sloupci <code>nazev;od;do;cas;typ</code>. Typ: akce, prazdniny, volno, rada, schuzky. Prázdniny a volna appka sama přeskakuje u opakovaných úkolů.</p>
      <div class="row-actions"><label class="btn">${icon('up')}Vybrat CSV s akcemi<input type="file" accept=".csv,text/csv" data-act="import-file" data-kind="akce" hidden></label>
      <a class="btn ghost" href="data/akce-2026-27.csv" download>Vzor: harmonogram 2026/27</a></div>
    </section>
    <section class="panel">
      <h3 class="eyebrow">2 – Úkoly (z harmonogramu nebo z porad)</h3>
      <p class="small">CSV se sloupci <code>nazev;popis;termin;cas;zobrazit_dni_predem;priorita;komu;typ;stitky;opakovani;zdroj</code>.</p>
      <ul class="small">
        <li><b>komu:</b> role oddělené svislítkem – ucitel, tridni, zastupce, asistent, vedeni, provoz, vsichni – nebo e-maily</li>
        <li><b>priorita:</b> gepard, zajic, snek</li>
        <li><b>opakovani:</b> prázdné, tydne, mesicne, posledni-v-mesici</li>
      </ul>
      <div class="row-actions"><label class="btn">${icon('up')}Vybrat CSV s úkoly<input type="file" accept=".csv,text/csv" data-act="import-file" data-kind="ukoly" hidden></label>
      <a class="btn ghost" href="data/ukoly-navrh-2026-27.csv" download>Vzor: návrh úkolů 2026/27</a></div>
      <details class="prompt"><summary>Zadání pro Clauda – převod zápisu z porady do CSV</summary>
        <textarea readonly rows="9">${h(CLAUDE_PROMPT)}</textarea>
        <button class="btn small" data-act="copy-prompt">Zkopírovat</button></details>
    </section>
    ${pv ? `<section class="panel preview">
      <h3 class="eyebrow">Náhled – ${pv.kind === 'akce' ? 'akce' : 'úkoly'}</h3>
      ${pv.errors.length ? `<div class="warnbox"><b>Upozornění</b><ul>${pv.errors.map((e) => `<li>${h(e)}</li>`).join('')}</ul></div>` : ''}
      <p><b>${pv.items.length}</b> ${pv.kind === 'akce' ? 'akcí' : 'úkolů'} připraveno k nahrání. Odškrtni, co nechceš.</p>
      <div class="pvlist">${pv.items.map((x, i) => `<label class="pv"><input type="checkbox" data-act="pv-toggle" data-i="${i}" ${x._off ? '' : 'checked'}>
        <span><b>${h(x.nazev)}</b><span class="muted small">${pv.kind === 'akce'
          ? `${C.fmtDate(C.parseYmd(x.od), true)}${x.do !== x.od ? `–${C.fmtDate(C.parseYmd(x.do), true)}` : ''}, ${x.typ}`
          : `${C.fmtDate(C.parseYmd(x.termin), true)}${x.cas ? ` ${x.cas}` : ''}, ${C.PRIORITY[x.priorita].label}, ${[...(x.cile.role || []).map((r) => C.TARGETS[r]), ...(x.cile.lide || [])].join(', ') || 'pro mě'}${x.opakovani ? `, ${C.REPEAT[x.opakovani]}` : ''}`}</span></span></label>`).join('')}</div>
      <div class="row-actions"><button class="btn primary" data-act="import-go">Nahrát vybrané</button><button class="btn ghost" data-act="import-cancel">Zrušit</button></div>
    </section>` : ''}`;
}

function adminNapojeni() {
  if (S.store.mode === 'demo') {
    return `<section class="panel"><p>Appka teď běží v <b>ukázkovém režimu</b> – data jsou jen v tomto prohlížeči.</p>
      <p class="small">Pro ostrý provoz vyplň v souboru <code>config.js</code> údaje z registrace aplikace a adresu SharePoint webu a přepni <code>mode</code> na <code>"sharepoint"</code>. Postup krok po kroku je v souboru <code>README.md</code>.</p></section>`;
  }
  return `<section class="panel">
      <h3 class="eyebrow">Seznamy na SharePointu</h3>
      <div id="liststatus" class="small muted">Zjišťuji…</div>
      <div class="row-actions"><button class="btn" data-act="list-status">Zkontrolovat</button><button class="btn primary" data-act="create-lists">Vytvořit chybějící seznamy</button></div>
    </section>
    <section class="panel">
      <h3 class="eyebrow">Rozepsání úkolů</h3>
      <p class="small">Appka jednou denně rozepíše plošné a opakované úkoly lidem na ${C.HORIZON_DAYS} dní dopředu – stačí, aby ji kdokoli otevřel. Tady to spustíš hned.</p>
      <p class="small muted">Naposledy: ${h(pref.get('lastMaterialize', 'nikdy'))}</p>
      <button class="btn" data-act="materialize-now">Rozepsat teď</button>
    </section>
    <section class="panel">
      <h3 class="eyebrow">Týdenní souhrn e-mailem</h3>
      <p class="small">Posílá ho Power Automate každé pondělí ráno ze seznamu ${h((cfg.listPrefix || 'UU_') + 'Prirazeni')}. Návod je v README.</p>
    </section>`;
}

function adminZaloha() {
  return `<section class="panel">
      <h3 class="eyebrow">Stáhnout data</h3>
      <div class="row-actions">
        <button class="btn" data-act="export-tasks">${icon('dl')}Úkoly (CSV)</button>
        <button class="btn" data-act="export-asg">${icon('dl')}Plnění úkolů (CSV)</button>
        <button class="btn" data-act="export-events">${icon('dl')}Akce (CSV)</button>
      </div>
    </section>
    ${S.store.mode === 'demo' ? `<section class="panel"><h3 class="eyebrow">Ukázka</h3>
      <p class="small">Smaže všechno v tomto prohlížeči a nahraje ukázková data znovu.</p>
      <button class="btn danger" data-act="demo-reset">${icon('trash')}Začít ukázku znovu</button></section>` : ''}`;
}

const CLAUDE_PROMPT = `Přečti přiložený zápis z porady (PDF) a vypiš z něj všechny úkoly a termíny jako CSV pro aplikaci Úkolníček.
Oddělovač je středník, kódování UTF-8, první řádek je hlavička:
nazev;popis;termin;cas;zobrazit_dni_predem;priorita;komu;typ;stitky;opakovani;zdroj

Pravidla:
- nazev: krátce, sloveso na začátku („Odevzdat…“, „Připravit…“)
- termin: RRRR-MM-DD; cas: HH:MM nebo prázdné
- zobrazit_dni_predem: kolik dní před termínem se úkol lidem objeví (obvykle 7, u velkých věcí 14)
- priorita: gepard (hoří), zajic (brzy), snek (počká)
- komu: ucitel, tridni, zastupce, asistent, vedeni, provoz, vsichni – více oddělených svislítkem; nebo e-mail konkrétního člověka
- typ: plosny pro role, prirazeny pro konkrétního člověka, spolecny pro skupinu lidí na jedné věci
- stitky: oddělené svislítkem (např. Klasifikace|Akce)
- opakovani: prázdné, tydne, mesicne, nebo posledni-v-mesici
- zdroj: „Porada DD. MM.“
Nic si nedomýšlej. Kde termín v zápisu chybí, úkol vynech a vypiš ho zvlášť pod CSV.`;

/* ---------- listy (dialogy) ---------- */

function sheet(html, cls = '') {
  closeSheet();
  const d = document.createElement('dialog');
  d.className = `sheet ${cls}`;
  d.innerHTML = `<div class="sheet-in">${html}</div>`;
  document.body.appendChild(d);
  d.addEventListener('close', () => d.remove());
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
  d.showModal();
  return d;
}
/** Potvrzení přímo v appce (systémové okno confirm() na některých místech nefunguje). */
function askConfirm(title, text, okLabel) {
  return new Promise((resolve) => {
    const d = sheet(`${sheetHead(title)}<p>${h(text)}</p>
      <div class="row-actions"><button class="btn primary danger-fill" data-ok>${h(okLabel)}</button><button class="btn ghost" data-no>Zrušit</button></div>`, 'confirm');
    let done = false;
    const fin = (v) => { if (done) return; done = true; resolve(v); d.close(); };
    d.querySelector('[data-ok]').onclick = (e) => { e.stopPropagation(); fin(true); };
    d.querySelector('[data-no]').onclick = (e) => { e.stopPropagation(); fin(false); };
    d.addEventListener('close', () => fin(false));
  });
}
function closeSheet() { document.querySelectorAll('dialog.sheet').forEach((d) => d.close()); }
const sheetHead = (title, eyebrow = '') => `<div class="sh-head"><div>${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ''}<h2>${h(title)}</h2></div>
  <button class="iconbtn" data-act="close" aria-label="Zavřít">${icon('close')}</button></div>`;

function openDetail(id) {
  const a = S.mine.find((x) => x.id === id);
  if (!a) return;
  const t = S.tasks.find((x) => x.id === a.ukolId);
  const due = C.fmtDue(a.termin, a.cas);
  const canEdit = t && (t.zadal === S.me.email || S.me.roles.has('spravce'));
  const others = a.typ === 'spolecny' ? (t?.cile?.lide || []).filter((e) => e !== S.me.email).map((e) => S.people.find((p) => p.email === e)?.jmeno || e) : [];
  sheet(`
    ${sheetHead(a.nazev, `${C.TYPES[a.typ] || ''}${a.zadal !== S.me.email ? ` – zadal(a) ${h(a.zadalJmeno)}` : ''}`)}
    <div class="d-meta">${priPill(a.priorita)}<span class="due due-${due.tone || 'x'}">${h(due.text)}</span>${(a.stitky || []).map((s) => `<span class="tag">${h(s)}</span>`).join('')}</div>
    <div class="stseg" role="radiogroup" aria-label="Stav úkolu">
      ${C.STATUS.map((s) => `<button role="radio" aria-checked="${a.stav === s.key}" class="sts st-${s.key} ${a.stav === s.key ? 'on' : ''}" data-act="set-status" data-id="${a.id}" data-v="${s.key}">
        <span class="st">${statusIcon(s.key)}</span>${s.label}</button>`).join('')}
    </div>
    ${a.popis ? `<p class="d-popis">${h(a.popis).replace(/\n/g, '<br>')}</p>` : ''}
    ${t?.plan ? `<div class="say"><span class="eyebrow">Můj plán</span>${h(t.plan)}</div>` : ''}
    ${a.kontrolni?.length ? `<div class="checklist"><div class="eyebrow">Kroky – ${a.kontrolni.filter((k) => k.done).length} z ${a.kontrolni.length}</div>
      ${a.kontrolni.map((k, i) => `<label class="ck"><input type="checkbox" data-act="check" data-id="${a.id}" data-i="${i}" ${k.done ? 'checked' : ''}><span>${h(k.t)}</span></label>`).join('')}</div>` : ''}
    ${others.length ? `<p class="small"><span class="eyebrow">Spolu s</span><br>${others.map(h).join(', ')}</p>` : ''}
    <label class="field"><span class="eyebrow">Poznámka pro mě</span><textarea rows="2" data-act="note" data-id="${a.id}" placeholder="Co je potřeba si pamatovat…">${h(a.poznamka)}</textarea></label>
    <div class="row-actions">
      <button class="btn ghost" data-act="ics-one" data-id="${a.id}">${icon('cal')}Do kalendáře</button>
      ${canEdit ? `<button class="btn ghost" data-act="edit-task" data-id="${t.id}">${icon('edit')}Upravit</button>
        <button class="btn ghost danger" data-act="delete-task" data-id="${t.id}">${icon('trash')}Smazat</button>` : ''}
    </div>`);
}

function openZadaneDetail(k) {
  const g = groupsOfZadane().find((x) => x.k === k);
  if (!g) return;
  const t = S.tasks.find((x) => x.id === g.ukolId);
  const by = (s) => g.items.filter((a) => a.stav === s).sort((a, b) => a.osobaJmeno.localeCompare(b.osobaJmeno, 'cs'));
  const col = (s) => { const l = by(s); return `<div class="zcol st-${s}"><div class="zc-h"><span class="st sm">${statusIcon(s)}</span>${C.STATUS[s].label}<span class="cnt">${l.length}</span></div>
    ${l.map((a) => `<div class="zc-p">${h(a.osobaJmeno)}${a.poznamka ? `<span class="muted small"> – ${h(a.poznamka)}</span>` : ''}</div>`).join('') || '<div class="muted small">nikdo</div>'}</div>`; };
  const notDone = g.items.filter((a) => a.stav < 2).map((a) => a.osoba);
  const canEdit = t && (t.zadal === S.me.email || S.me.roles.has('spravce'));
  const due = C.fmtDue(g.termin, g.cas);
  const mail = `mailto:?bcc=${encodeURIComponent(notDone.join(';'))}&subject=${encodeURIComponent(`Připomínka: ${g.nazev}`)}&body=${encodeURIComponent(`Dobrý den,\n\npřipomínám úkol „${g.nazev}“ s termínem ${due.text}.\n\nDíky!\n${S.me.jmeno}\n\n${cfg.appUrl || location.href.split('#')[0]}`)}`;
  sheet(`
    ${sheetHead(g.nazev, `${C.TYPES[g.typ]}${g.typ === 'plosny' && t ? ` – ${(t.cile?.role || []).map((r) => C.TARGETS[r]).join(', ')}` : ''}`)}
    <div class="d-meta">${priPill(g.priorita)}<span class="due due-${due.tone || 'x'}">${h(due.text)}</span></div>
    ${t?.popis ? `<p class="d-popis">${h(t.popis)}</p>` : ''}
    <div class="zcols">${col(0)}${col(1)}${col(2)}</div>
    <div class="row-actions">
      ${notDone.length ? `<a class="btn" href="${mail}">${icon('mail')}Připomenout ${notDone.length} ${plural(notDone.length, 'člověku', 'lidem', 'lidem')} e-mailem</a>` : ''}
      ${canEdit ? `<button class="btn ghost" data-act="edit-task" data-id="${t.id}">${icon('edit')}Upravit</button>
        <button class="btn ghost danger" data-act="delete-task" data-id="${t.id}">${icon('trash')}Smazat</button>` : ''}
    </div>`);
}

/* ---------- formulář úkolu ---------- */

let F = null; // rozpracovaný formulář

function openForm(task) {
  const today = new Date();
  const editing = !!task;
  F = task ? structuredClone(task) : {
    nazev: '', popis: '', termin: C.ymd(C.addDays(today, 1)), cas: '', priorita: 'zajic', typ: 'osobni', cile: { role: [], lide: [] },
    stitky: [], zobrazitDni: null, opakovani: '', kontrolni: [], plan: '', outlook: true, aktivni: true,
  };
  F.cile = { role: [], lide: [], ...(F.cile || {}) };
  F._show = task && ['1', '3', '7', '14', '30'].includes(String(task.zobrazitDni)) ? String(task.zobrazitDni) : 'hned';
  F._editing = editing;
  F._q = '';
  drawForm();
}

function drawForm() {
  const d = document.querySelector('dialog.sheet.form');
  const html = formHtml();
  if (d) {
    const y = d.querySelector('.sheet-in').scrollTop;
    const focusName = document.activeElement?.dataset?.f;
    d.querySelector('.sheet-in').innerHTML = html;
    d.querySelector('.sheet-in').scrollTop = y;
    if (focusName) { const el = d.querySelector(`[data-f="${focusName}"]`); if (el) { el.focus(); if (['text', 'search'].includes(el.type)) { const v = el.value.length; el.setSelectionRange(v, v); } } }
  } else {
    sheet(html, 'form full');
    setTimeout(() => document.querySelector('[data-f="nazev"]')?.focus(), 60);
  }
}

function formHtml() {
  const today = C.startOfDay(new Date());
  const canAll = C.canBroadcast(S.me);
  const toFri = (5 - C.isoWeekday(today) + 7) % 7;
  const toMon = 8 - C.isoWeekday(today);
  const quick = [['Dnes', 0], ['Zítra', 1], ...(toFri >= 2 ? [['V pátek', toFri]] : []), ...(toMon >= 2 && toMon !== 7 ? [['V pondělí', toMon]] : []), ['Za týden', 7]];
  const tags = [...new Set([...S.tasks.flatMap((t) => t.stitky || []), 'Klasifikace', 'Třídnictví', 'Akce', 'Administrativa'])].sort((a, b) => a.localeCompare(b, 'cs'));
  const q = (F._q || '').toLowerCase();
  const others = S.people.filter((p) => p.aktivni !== false && p.email !== S.me.email);
  const matches = q ? others.filter((p) => p.jmeno.toLowerCase().includes(q) || p.email.includes(q)).slice(0, 6) : [];
  const chosen = (F.cile.lide || []).filter((e) => e !== S.me.email);
  const types = Object.entries(C.TYPES).filter(([k]) => k !== 'plosny' || canAll);
  const recCount = F.typ === 'plosny' ? C.recipientsOf({ ...F, zadal: S.me.email }, S.people).size : 0;
  return `
    ${sheetHead(F._editing ? 'Upravit úkol' : 'Nový úkol')}
    <form class="tform" data-act="form-submit" novalidate>
      <label class="field"><span class="eyebrow">Co je potřeba udělat?</span>
        <input type="text" data-f="nazev" value="${h(F.nazev)}" placeholder="Např. Odevzdat výkaz práce" maxlength="200" required autocomplete="off"></label>

      <div class="field"><span class="eyebrow">Pro koho</span>
        <div class="seg wrap">${types.map(([k, l]) => `<button type="button" class="${F.typ === k ? 'on' : ''}" data-act="f-typ" data-v="${k}">${l}</button>`).join('')}</div>
        ${F.typ === 'prirazeny' || F.typ === 'spolecny' ? `
          <div class="chosen">${chosen.map((e) => `<button type="button" class="chip on" data-act="f-unpick" data-v="${h(e)}">${h(S.people.find((p) => p.email === e)?.jmeno || e)} ${icon('close', 'xs')}</button>`).join('')}
            ${F.typ === 'spolecny' ? '<span class="chip ghost">a já</span>' : ''}</div>
          <input type="search" data-f="_q" value="${h(F._q)}" placeholder="Napiš jméno kolegy…" autocomplete="off" aria-label="Hledat kolegu">
          ${matches.length ? `<div class="pmatch">${matches.map((p) => `<button type="button" data-act="f-pick" data-v="${h(p.email)}"><b>${h(p.jmeno)}</b><span class="muted small">${[...C.personRoles(p)].map((r) => C.ROLE_LABELS[r]).join(', ')}</span></button>`).join('')}</div>` : ''}` : ''}
        ${F.typ === 'plosny' ? `<div class="rolegrid">${Object.entries(C.TARGETS).map(([k, l]) => `<label class="rchk"><input type="checkbox" data-act="f-role" data-v="${k}" ${(F.cile.role || []).includes(k) ? 'checked' : ''}><span>${l}<small>${S.people.filter((p) => p.aktivni !== false && C.matchesTarget(p, k)).length}</small></span></label>`).join('')}</div>
          <p class="small muted">Dostane ${recCount} ${plural(recCount, 'člověk', 'lidé', 'lidí')}. Každý má svůj úkol a ty uvidíš, kdo má hotovo.</p>` : ''}
      </div>

      <div class="field"><span class="eyebrow">Do kdy</span>
        <div class="chips">${quick.map(([l, n]) => `<button type="button" class="chip ${F.termin === C.ymd(C.addDays(today, n)) ? 'on' : ''}" data-act="f-date" data-v="${C.ymd(C.addDays(today, n))}">${l}</button>`).join('')}</div>
        <div class="two"><input type="date" data-f="termin" value="${h(F.termin)}" aria-label="Datum termínu">
          <input type="time" data-f="cas" value="${h(F.cas)}" aria-label="Čas (nepovinný)"></div>
        ${F.termin ? `<p class="small muted">${C.fmtWeekday(C.parseYmd(F.termin), true)} ${C.fmtDate(C.parseYmd(F.termin), true)}${F.cas ? ` v ${F.cas}` : ' – čas nemusíš vyplňovat'}</p>` : ''}
      </div>

      <div class="field"><span class="eyebrow">Jak moc to spěchá</span>
        <div class="prigrid">${C.PRIORITY_ORDER.map((k) => `<button type="button" class="prib pri-${k} ${F.priorita === k ? 'on' : ''}" data-act="f-pri" data-v="${k}" aria-pressed="${F.priorita === k}">
          ${chevrons(C.PRIORITY[k].n)}<b>${C.PRIORITY[k].label}</b><small>${C.PRIORITY[k].hint}</small></button>`).join('')}</div>
      </div>

      <details class="more" ${F._editing || F.popis || F.opakovani || F.kontrolni?.length ? 'open' : ''}>
        <summary>Další možnosti</summary>
        <label class="field"><span class="eyebrow">Popis</span><textarea rows="3" data-f="popis" placeholder="Podrobnosti, odkaz, kam to odevzdat…">${h(F.popis)}</textarea></label>
        <div class="field"><span class="eyebrow">Kdy se úkol objeví</span>
          <select data-f="_show">
            ${[['hned', F.opakovani ? 'Týden předem' : 'Hned'], ['1', 'Den předem'], ['3', '3 dny předem'], ['7', 'Týden předem'], ['14', '2 týdny předem'], ['30', 'Měsíc předem']]
              .map(([v, l]) => `<option value="${v}" ${F._show === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
          <p class="small muted">Do té doby úkol nikoho neruší. Uvidíš ho jen v Kalendáři.</p></div>
        <div class="field"><span class="eyebrow">Opakování</span>
          <select data-f="opakovani">${Object.entries(C.REPEAT).map(([v, l]) => `<option value="${v}" ${F.opakovani === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
          ${F.opakovani === 'posledni-v-mesici' && F.termin ? `<p class="small muted">Vždy poslední ${C.fmtWeekday(C.parseYmd(F.termin), true)} v měsíci. Když padne na prázdniny, posune se na poslední pracovní den před nimi.</p>` : ''}
          ${F.opakovani === 'tydne' ? '<p class="small muted">O prázdninách a ředitelském volnu se vynechá.</p>' : ''}</div>
        <div class="field"><span class="eyebrow">Štítky</span>
          <input type="text" data-f="_tags" value="${h((F.stitky || []).join(', '))}" placeholder="Např. Klasifikace, Akce">
          <div class="chips">${tags.filter((t) => !(F.stitky || []).includes(t)).slice(0, 8).map((t) => `<button type="button" class="chip" data-act="f-tag" data-v="${h(t)}">+ ${h(t)}</button>`).join('')}</div></div>
        <label class="field"><span class="eyebrow">Kroky (každý na nový řádek)</span><textarea rows="3" data-f="_kroky" placeholder="Opravit&#10;Zapsat známky&#10;Rozdat">${h((F.kontrolni || []).join('\n'))}</textarea></label>
        ${F.typ === 'osobni' ? `<label class="field"><span class="eyebrow">Kdy a kde na tom budu pracovat?</span>
          <input type="text" data-f="plan" value="${h(F.plan)}" placeholder="Např. v úterý po 6. hodině v kabinetu">
          <span class="small muted">Konkrétní plán „kdy a kde“ výrazně zvyšuje šanci, že úkol opravdu uděláš.</span></label>` : ''}
        <label class="switch"><input type="checkbox" data-f="outlook" ${F.outlook !== false ? 'checked' : ''}><span>Zapsat do Outlook kalendáře</span></label>
      </details>

      <div class="form-foot">
        <button type="submit" class="btn primary big">${F._editing ? 'Uložit změny' : 'Uložit úkol'}</button>
      </div>
    </form>`;
}

function readFormField(el) {
  const f = el.dataset.f;
  if (!f) return;
  if (f === 'outlook') F.outlook = el.checked;
  else if (f === '_tags') F.stitky = el.value.split(',').map((s) => s.trim()).filter(Boolean);
  else if (f === '_kroky') F.kontrolni = el.value.split('\n').map((s) => s.trim()).filter(Boolean);
  else F[f] = el.value;
}

async function submitForm() {
  document.querySelectorAll('dialog.form [data-f]').forEach(readFormField);
  const err = [];
  if (!F.nazev.trim()) err.push('Napiš, co je potřeba udělat.');
  if (!C.parseYmd(F.termin)) err.push('Vyber termín.');
  if ((F.typ === 'prirazeny' || F.typ === 'spolecny') && !(F.cile.lide || []).filter((e) => e !== S.me.email).length) err.push('Vyber aspoň jednoho kolegu.');
  if (F.typ === 'plosny' && !(F.cile.role || []).length) err.push('Vyber, komu plošně úkol patří.');
  if (err.length) { toast(err[0], { tone: 'warn' }); return; }

  const due = C.dueDate(F.termin, F.cas);
  // „Hned“ = jednorázový úkol se objeví ihned; opakovaný týden před každým termínem
  const zobrazitDni = F._show === 'hned' ? (F.opakovani ? 7 : Math.max(0, C.diffDays(due, new Date()))) : +F._show;
  const lide = F.typ === 'spolecny' ? [...new Set([S.me.email, ...(F.cile.lide || [])])] : F.typ === 'prirazeny' ? F.cile.lide : [];
  const task = {
    ...F, nazev: F.nazev.trim(), zobrazitDni,
    cile: F.typ === 'plosny' ? { role: F.cile.role } : { lide },
    zadal: F.zadal || S.me.email, zadalJmeno: F.zadalJmeno || S.me.jmeno, zdroj: F.zdroj || 'Ručně',
  };
  for (const k of Object.keys(task)) if (k.startsWith('_')) delete task[k];
  closeSheet();
  busy(1);
  try {
    const saved = await S.store.saveTask(task);
    const i = S.tasks.findIndex((t) => t.id === saved.id);
    if (i >= 0) S.tasks[i] = saved; else S.tasks.push(saved);
    await materialize({ taskIds: new Set([saved.id]) });
    await reloadMine();
    render();
    const n = C.recipientsOf(saved, S.people).size;
    toast(task.typ === 'osobni' ? 'Úkol uložen.' : `Úkol uložen a poslán ${n} ${plural(n, 'člověku', 'lidem', 'lidem')}.`);
    syncOutlookSoon();
  } catch (e) { showError(e); } finally { busy(-1); }
}

/* ---------- akce ---------- */

async function setStatus(id, stav, { undo = true } = {}) {
  const a = S.mine.find((x) => x.id === id) || (S.zadane || []).find((x) => x.id === id);
  if (!a) return;
  const prev = a.stav;
  if (prev === stav) return;
  const patch = { stav, hotovo: stav === 2 ? new Date().toISOString() : null };
  let targets = [a];
  if (a.typ === 'spolecny') targets = (await S.store.assignments({ ukolId: a.ukolId })).filter((x) => x.vyskyt === a.vyskyt);
  for (const t of targets) { const m = S.mine.find((x) => x.id === t.id); if (m) Object.assign(m, patch); }
  Object.assign(a, patch);
  render();
  if (document.querySelector('dialog.sheet') && !document.querySelector('dialog.form')) openDetail(id);
  if (stav === 2) {
    closeSheet();
    const left = visibleOpen().filter((x) => new Date(x.termin) < C.addDays(C.startOfWeek(new Date()), 7)).length;
    toast(`Hotovo. ${left ? `Tento týden zbývá ${left}.` : 'Tento týden máš všechno!'}`, undo ? { action: 'Vrátit', onAction: () => setStatus(id, prev, { undo: false }) } : {});
  }
  try {
    await S.store.updateAssignments(targets.map((t) => ({ id: t.id, patch })));
    S.zadane = null;
    syncOutlookSoon(4000);
  } catch (e) { showError(e); }
}

async function cycle(id) {
  const a = S.mine.find((x) => x.id === id);
  if (!a) return;
  await setStatus(id, Math.min(2, a.stav + 1));
}

async function toggleCheck(id, i, done) {
  const a = S.mine.find((x) => x.id === id);
  if (!a) return;
  a.kontrolni[i].done = done;
  let targets = [a];
  if (a.typ === 'spolecny') targets = (await S.store.assignments({ ukolId: a.ukolId })).filter((x) => x.vyskyt === a.vyskyt);
  const patch = { kontrolni: a.kontrolni };
  if (a.stav === 0 && done) { patch.stav = 1; a.stav = 1; }
  await S.store.updateAssignments(targets.map((t) => ({ id: t.id, patch })));
  render();
  openDetail(id);
  if (a.kontrolni.every((k) => k.done) && a.stav < 2) toast('Všechny kroky hotové. Označit celý úkol?', { action: 'Hotovo', onAction: () => setStatus(id, 2) });
}

async function deleteTask(id) {
  const t = S.tasks.find((x) => x.id === id);
  if (!t) return;
  if (!await askConfirm(`Smazat „${t.nazev}“?`, 'Zmizí všem, kdo ho ještě nemají hotový. Hotové zůstanou v historii.', 'Smazat úkol')) return;
  closeSheet();
  busy(1);
  try {
    const asg = await S.store.assignments({ ukolId: id });
    await S.store.deleteAssignments(asg.filter((a) => a.stav < 2).map((a) => a.id));
    await S.store.deleteTask(id);
    S.tasks = S.tasks.filter((x) => x.id !== id);
    await reloadMine();
    render();
    toast('Úkol smazán.');
    syncOutlookSoon();
  } catch (e) { showError(e); } finally { busy(-1); }
}

function download(name, text, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function importFile(input) {
  const file = input.files?.[0];
  if (!file) return;
  const text = await file.text();
  const rows = parseCsv(text);
  if (input.dataset.kind === 'akce') {
    const { events, errors } = eventsFromCsv(rows);
    S.importPreview = { kind: 'akce', items: events, errors };
  } else {
    const { tasks, errors } = tasksFromCsv(rows, S.me);
    S.importPreview = { kind: 'ukoly', items: tasks, errors };
  }
  input.value = '';
  render();
}

async function importGo() {
  const pv = S.importPreview;
  const items = pv.items.filter((x) => !x._off).map(({ _off, ...x }) => x);
  if (!items.length) return;
  busy(1);
  try {
    if (pv.kind === 'akce') {
      const known = new Set(S.events.map((e) => `${e.nazev}|${e.od}`));
      const fresh = items.filter((e) => !known.has(`${e.nazev}|${e.od}`));
      await S.store.addEvents(fresh);
      S.events = await S.store.events();
      S.hol = C.holidaySet(S.events);
      toast(`Nahráno ${fresh.length} akcí${items.length - fresh.length ? `, ${items.length - fresh.length} už tam bylo` : ''}.`);
    } else {
      const known = new Set(S.tasks.map((t) => `${t.nazev}|${t.termin}`));
      const ids = new Set();
      let skip = 0;
      for (const t of items) {
        if (known.has(`${t.nazev}|${t.termin}`)) { skip++; continue; }
        const saved = await S.store.saveTask(t);
        S.tasks.push(saved); ids.add(saved.id);
      }
      if (ids.size) await materialize({ taskIds: ids });
      toast(`Nahráno ${ids.size} úkolů${skip ? `, ${skip} už tam bylo` : ''}.`);
    }
    S.importPreview = null;
    await reloadMine();
    render();
  } catch (e) { showError(e); } finally { busy(-1); }
}

function openPerson(p) {
  const isNew = !p;
  p = p || { email: '', jmeno: '', roles: [], roleNavic: [], tridnictvi: '', zastupce: '', aktivni: true };
  const sp = S.store.mode === 'sharepoint';
  const fromGroups = new Set(p.roleSkupiny || []);
  const extra = new Set(sp ? (p.roleNavic || []) : (p.roles || []));
  sheet(`
    ${sheetHead(isNew ? 'Nový člověk' : p.jmeno, 'Lidé a role')}
    <form class="tform" data-act="person-submit" data-id="${h(p.id || '')}">
      <label class="field"><span class="eyebrow">Jméno</span><input type="text" name="jmeno" value="${h(p.jmeno)}" required></label>
      <label class="field"><span class="eyebrow">Školní e-mail</span><input type="email" name="email" value="${h(p.email)}" ${isNew ? '' : 'readonly'} required></label>
      <div class="field"><span class="eyebrow">Role</span>
        <div class="rolegrid">${['ucitel', 'asistent', 'vedeni', 'provoz'].map((r) => `<label class="rchk"><input type="checkbox" name="role" value="${r}" ${extra.has(r) || fromGroups.has(r) ? 'checked' : ''} ${fromGroups.has(r) ? 'disabled' : ''}>
          <span>${C.ROLE_LABELS[r]}${fromGroups.has(r) ? '<small>ze skupiny</small>' : ''}</span></label>`).join('')}</div></div>
      <div class="two">
        <label class="field"><span class="eyebrow">Třídní učitel třídy</span><input type="text" name="tridnictvi" value="${h(p.tridnictvi)}" placeholder="např. 7.A"></label>
        <label class="field"><span class="eyebrow">Zástupce třídního</span><input type="text" name="zastupce" value="${h(p.zastupce)}" placeholder="např. 7.A"></label>
      </div>
      <label class="switch"><input type="checkbox" name="aktivni" ${p.aktivni !== false ? 'checked' : ''}><span>Aktivní (dostává úkoly)</span></label>
      <div class="form-foot"><button class="btn primary big" type="submit">Uložit</button></div>
    </form>`);
}

async function savePersonForm(form) {
  const fd = new FormData(form);
  const id = form.dataset.id;
  const old = S.people.find((p) => p.id === id) || {};
  const roles = fd.getAll('role');
  const p = {
    ...old, id: id || undefined, jmeno: fd.get('jmeno').trim(), email: (fd.get('email') || old.email).trim().toLowerCase(),
    tridnictvi: fd.get('tridnictvi').trim(), zastupce: fd.get('zastupce').trim(), aktivni: fd.get('aktivni') === 'on',
  };
  if (S.store.mode === 'sharepoint') p.roleNavic = roles; else p.roles = [...new Set([...(old.roles || []).filter((r) => r === 'spravce'), ...roles])];
  closeSheet();
  busy(1);
  try {
    await S.store.savePerson(p);
    S.people = await S.store.people();
    if (p.email === S.me.email) S.me = await S.store.me();
    await materialize({ force: true });
    render();
    toast('Uloženo. Úkoly se lidem přepočítaly.');
  } catch (e) { showError(e); } finally { busy(-1); }
}

function toast(msg, { action, onAction, tone } = {}) {
  const box = document.getElementById('toasts');
  if (!box) return;
  const el = document.createElement('div');
  el.className = `toast ${tone || ''}`;
  el.innerHTML = `<span>${h(msg)}</span>${action ? `<button>${h(action)}</button>` : ''}`;
  if (action) el.querySelector('button').onclick = () => { el.remove(); onAction(); };
  box.appendChild(el);
  setTimeout(() => el.classList.add('out'), action ? 6000 : 3200);
  setTimeout(() => el.remove(), action ? 6500 : 3700);
}
function showError(e) {
  console.error(e);
  S.error = e.code === 'accessDenied' || e.status === 403
    ? 'Na tohle nemáš na SharePointu oprávnění. Napiš správci.'
    : `Nepovedlo se uložit: ${e.message || e}`;
  render();
}

function applyTheme() {
  const t = pref.get('theme', 'auto');
  if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
}

/* ---------- události ---------- */

window.addEventListener('hashchange', () => {
  S.view = location.hash.slice(1) || 'moje';
  closeSheet();
  if (S.view === 'zadane') S.zadane = null;
  render();
  window.scrollTo(0, 0);
});

document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.tagName === 'FORM') return;
  const act = el.dataset.act;
  const id = el.dataset.id;
  const v = el.dataset.v;
  const fieldActs = ['check', 'note', 'search', 'pref-outlook', 'f-role', 'pv-toggle', 'import-file'];
  if (fieldActs.includes(act)) return;
  switch (act) {
    case 'login': return S.store.login();
    case 'logout': return S.store.logout();
    case 'reload': return location.reload();
    case 'dismiss-error': S.error = ''; return render();
    case 'new': return openForm(null);
    case 'close': return closeSheet();
    case 'cycle': return cycle(id);
    case 'open': return openDetail(id);
    case 'set-status': return setStatus(id, +v);
    case 'filter': S.filter = v; return render();
    case 'toggle-later': S.laterOpen = !S.laterOpen; return render();
    case 'intro-done': pref.set('introDone', true); return render();
    case 'intro-again': pref.set('introDone', false); location.hash = '#moje'; return render();
    case 'reopen': return setStatus(id, 1, { undo: false });
    case 'cal-prev': case 'cal-next': {
      const d = new Date(S.cal.y, S.cal.m + (act === 'cal-next' ? 1 : -1), 1);
      S.cal = { y: d.getFullYear(), m: d.getMonth(), sel: null }; return render();
    }
    case 'cal-today': S.cal = null; return render();
    case 'cal-day': S.cal.sel = S.cal.sel === el.dataset.d ? null : el.dataset.d; return render();
    case 'cal-all': S.cal.sel = null; return render();
    case 'zad-mode': S.zadaneMode = v; S.zadane = null; return render();
    case 'zad-open': return openZadaneDetail(el.dataset.k);
    case 'edit-task': { const t = S.tasks.find((x) => x.id === id); if (t) openForm(t); return; }
    case 'delete-task': return deleteTask(id);
    case 'ics-one': { const a = S.mine.find((x) => x.id === id); if (a) download('ukol.ics', C.toIcs([a]), 'text/calendar'); return; }
    case 'ics-all': return download('ukolnicek-moje-terminy.ics', C.toIcs(S.mine.filter((a) => a.stav < 2)), 'text/calendar');
    case 'theme': pref.set('theme', v); applyTheme(); return render();
    case 'install': if (S.installEvt) { S.installEvt.prompt(); S.installEvt = null; } return;
    case 'demo-as': await S.store.switchUser(v); S.me = await S.store.me(); await reloadMine(); location.hash = '#moje'; render(); return toast(`Teď vidíš appku jako ${S.me.jmeno}.`);
    case 'demo-reset': if (await askConfirm('Začít ukázku znovu?', 'Smaže všechno v tomto prohlížeči a nahraje ukázková data.', 'Začít znovu')) { await S.store.reset(); location.reload(); } return;
    case 'admin-tab': S.admin = v; return render();
    case 'person-new': return openPerson(null);
    case 'person-edit': return openPerson(S.people.find((p) => p.id === id));
    case 'sync-groups': {
      busy(1);
      try { const r = await S.store.syncPeopleFromGroups(); S.people = await S.store.people(); await materialize({ force: true }); render(); toast(`Ze skupin načteno ${r.celkem} lidí.`); } catch (er) { showError(er); } finally { busy(-1); }
      return;
    }
    case 'list-status': return refreshListStatus();
    case 'create-lists': case 'create-lists-boot': {
      busy(1);
      try { await S.store.createLists(); toast('Seznamy jsou vytvořené.'); if (act === 'create-lists-boot') return location.reload(); refreshListStatus(); } catch (er) { showError(er); } finally { busy(-1); }
      return;
    }
    case 'materialize-now': await materialize({ force: true }); render(); return toast('Úkoly rozepsané.');
    case 'import-go': return importGo();
    case 'import-cancel': S.importPreview = null; return render();
    case 'copy-prompt': try { await navigator.clipboard.writeText(CLAUDE_PROMPT); toast('Zkopírováno.'); } catch { toast('Zkopíruj text ručně.'); } return;
    case 'export-tasks': return download('ukolnicek-ukoly.csv', toCsv(S.tasks.map((t) => ({ ...t, komu: [...(t.cile?.role || []), ...(t.cile?.lide || [])], zobrazit_dni_predem: t.zobrazitDni })),
      ['nazev', 'popis', 'termin', 'cas', 'zobrazit_dni_predem', 'priorita', 'komu', 'typ', 'stitky', 'opakovani', 'zdroj']));
    case 'export-asg': {
      const all = await S.store.assignments({});
      return download('ukolnicek-plneni.csv', toCsv(all.map((a) => ({ ...a, termin: new Date(a.termin).toLocaleString('cs-CZ'), stav: C.STATUS[a.stav].label, hotovo: a.hotovo ? new Date(a.hotovo).toLocaleString('cs-CZ') : '' })),
        ['nazev', 'osobaJmeno', 'osoba', 'termin', 'priorita', 'stav', 'hotovo', 'zadalJmeno', 'typ', 'poznamka']));
    }
    case 'export-events': return download('ukolnicek-akce.csv', toCsv(S.events, ['nazev', 'od', 'do', 'cas', 'typ']));
    // formulář
    case 'f-typ': collectForm(); F.typ = v; if (v === 'plosny' && !F.cile.role.length) F.cile.role = []; return drawForm();
    case 'f-pick': collectForm(); F.cile.lide = [...new Set([...(F.cile.lide || []), v])]; F._q = ''; return drawForm();
    case 'f-unpick': collectForm(); F.cile.lide = (F.cile.lide || []).filter((x) => x !== v); return drawForm();
    case 'f-date': collectForm(); F.termin = v; return drawForm();
    case 'f-pri': collectForm(); F.priorita = v; return drawForm();
    case 'f-tag': collectForm(); F.stitky = [...new Set([...(F.stitky || []), v])]; return drawForm();
    default:
  }
});

function collectForm() { document.querySelectorAll('dialog.form [data-f]').forEach(readFormField); }

document.addEventListener('change', async (e) => {
  const el = e.target;
  const act = el.dataset.act;
  if (el.dataset.f && document.querySelector('dialog.form')) {
    readFormField(el);
    if (['opakovani', 'termin', '_show'].includes(el.dataset.f)) drawForm();
    return;
  }
  if (act === 'check') return toggleCheck(el.dataset.id, +el.dataset.i, el.checked);
  if (act === 'note') {
    const a = S.mine.find((x) => x.id === el.dataset.id);
    if (a && a.poznamka !== el.value) { a.poznamka = el.value; try { await S.store.updateAssignments([{ id: a.id, patch: { poznamka: a.poznamka } }]); toast('Poznámka uložena.'); } catch (er) { showError(er); } }
    return;
  }
  if (act === 'pref-outlook') { pref.set('outlook', el.checked); if (el.checked) syncOutlookSoon(100); return; }
  if (act === 'f-role') { collectForm(); F.cile.role = el.checked ? [...new Set([...F.cile.role, el.dataset.v])] : F.cile.role.filter((r) => r !== el.dataset.v); return drawForm(); }
  if (act === 'pv-toggle') { S.importPreview.items[+el.dataset.i]._off = !el.checked; return; }
  if (act === 'import-file') return importFile(el);
});

document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.act === 'search') {
    S.search = el.value;
    const pos = el.selectionStart;
    render();
    const n = document.querySelector('[data-act="search"]');
    if (n) { n.focus(); n.setSelectionRange(pos, pos); }
  }
  if (el.dataset.f === '_q') { F._q = el.value; collectForm(); drawForm(); }
});

document.addEventListener('submit', (e) => {
  const f = e.target;
  if (f.dataset.act === 'form-submit') { e.preventDefault(); submitForm(); }
  if (f.dataset.act === 'person-submit') { e.preventDefault(); savePersonForm(f); }
});

async function refreshListStatus() {
  const box = document.getElementById('liststatus');
  if (!box) return;
  try {
    const st = await S.store.listStatus();
    box.innerHTML = st.map((s) => `<div>${s.exists ? '✓' : '✗'} ${h(s.name)}${s.exists ? '' : ' – chybí'}</div>`).join('');
  } catch (e) { box.textContent = e.message; }
}

boot();
