// Ostrý režim: přihlášení školním účtem Microsoft 365 (MSAL) a data v seznamech na školním SharePointu
// přes Microsoft Graph. Stejné rozhraní jako store-demo.js.
import { ROLE_LABELS, reminderMinutes, PRIORITY, addDays, startOfDay } from './core.js';

const MSAL_URL = 'https://cdn.jsdelivr.net/npm/@azure/msal-browser@5.27.0/+esm';
const GRAPH = 'https://graph.microsoft.com/v1.0';
export const SCOPES = ['User.Read', 'Sites.ReadWrite.All', 'Calendars.ReadWrite', 'GroupMember.Read.All', 'Files.ReadWrite.All'];
const PREFER = { Prefer: 'HonorNonIndexedQueriesWarningMayFailRandomly' };

// Sloupce seznamů. [název, typ, indexovat]
export const SCHEMA = {
  Ukoly: [['Popis', 'note'], ['Priorita', 'text'], ['Typ', 'text', true], ['Cile', 'note'], ['Termin', 'dateTime'], ['Cas', 'text'],
    ['ZobrazitDni', 'number'], ['Opakovani', 'text'], ['Stitky', 'text'], ['Plan', 'note'], ['Zadal', 'text', true], ['ZadalJmeno', 'text'],
    ['Kontrolni', 'note'], ['Odkazy', 'note'], ['Outlook', 'boolean'], ['Aktivni', 'boolean'], ['Zdroj', 'text'], ['Vytvoreno', 'dateTime']],
  Prirazeni: [['UkolId', 'text', true], ['Vyskyt', 'text'], ['Klic', 'text', true], ['Osoba', 'text', true], ['OsobaJmeno', 'text'],
    ['Stav', 'number', true], ['Popis', 'note'], ['Priorita', 'text'], ['Termin', 'dateTime', true], ['Cas', 'text'], ['ZobrazitOd', 'dateTime'],
    ['Stitky', 'text'], ['Zadal', 'text', true], ['ZadalJmeno', 'text'], ['Typ', 'text', true], ['Hotovo', 'dateTime'], ['Poznamka', 'note'],
    ['Kontrolni', 'note'], ['Odkazy', 'note'], ['Outlook', 'boolean'], ['OutlookId', 'text']],
  Lide: [['Email', 'text', true], ['RoleSkupiny', 'text'], ['RoleNavic', 'text'], ['Tridnictvi', 'text'], ['Zastupce', 'text'],
    ['Aktivni', 'boolean'], ['Videno', 'dateTime']],
  Akce: [['Od', 'dateTime'], ['Do', 'dateTime'], ['Cas', 'text'], ['TypAkce', 'text'], ['Zdroj', 'text']],
};

const colDef = ([name, type, indexed]) => {
  const c = { name, indexed: !!indexed };
  if (type === 'text') c.text = {};
  if (type === 'note') c.text = { allowMultipleLines: true, linesForEditing: 6 };
  if (type === 'number') c.number = {};
  if (type === 'boolean') c.boolean = {};
  if (type === 'dateTime') c.dateTime = { format: 'dateTime' };
  return c;
};

const j = (s, fb) => { try { return s ? JSON.parse(s) : fb; } catch { return fb; } };
const iso = (d) => (d ? new Date(d).toISOString() : null);
const odata = (s) => String(s).replace(/'/g, "''");

/* ---------- převody položek SharePointu na objekty aplikace a zpět ---------- */

const fromTask = (it) => { const f = it.fields; return {
  id: it.id, nazev: f.Title || '', popis: f.Popis || '', priorita: f.Priorita || 'zajic', typ: f.Typ || 'osobni', cile: j(f.Cile, {}),
  termin: f.Termin ? toLocalYmd(f.Termin) : '', cas: f.Cas || '', zobrazitDni: f.ZobrazitDni ?? 7, opakovani: f.Opakovani || '',
  stitky: (f.Stitky || '').split('|').filter(Boolean), plan: f.Plan || '', zadal: (f.Zadal || '').toLowerCase(), zadalJmeno: f.ZadalJmeno || '',
  kontrolni: j(f.Kontrolni, []), odkazy: j(f.Odkazy, []), outlook: f.Outlook !== false, aktivni: f.Aktivni !== false, zdroj: f.Zdroj || '', vytvoreno: f.Vytvoreno || it.createdDateTime,
}; };
const toTask = (t) => ({
  Title: t.nazev, Popis: t.popis || '', Priorita: t.priorita, Typ: t.typ, Cile: JSON.stringify(t.cile || {}),
  Termin: iso(new Date(`${t.termin}T12:00:00`)), Cas: t.cas || '', ZobrazitDni: +t.zobrazitDni || 0, Opakovani: t.opakovani || '',
  Stitky: (t.stitky || []).join('|'), Plan: t.plan || '', Zadal: t.zadal, ZadalJmeno: t.zadalJmeno || '',
  Kontrolni: JSON.stringify(t.kontrolni || []), Odkazy: JSON.stringify(t.odkazy || []), Outlook: t.outlook !== false, Aktivni: t.aktivni !== false, Zdroj: t.zdroj || '',
  ...(t.vytvoreno ? { Vytvoreno: iso(t.vytvoreno) } : {}),
});
function toLocalYmd(isoStr) { const d = new Date(isoStr); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

const fromAsg = (it) => { const f = it.fields; return {
  id: it.id, ukolId: f.UkolId, vyskyt: f.Vyskyt, klic: f.Klic, osoba: (f.Osoba || '').toLowerCase(), osobaJmeno: f.OsobaJmeno || '',
  nazev: f.Title || '', popis: f.Popis || '', priorita: f.Priorita || 'zajic', termin: f.Termin, cas: f.Cas || '', zobrazitOd: f.ZobrazitOd,
  stitky: (f.Stitky || '').split('|').filter(Boolean), zadal: (f.Zadal || '').toLowerCase(), zadalJmeno: f.ZadalJmeno || '', typ: f.Typ || '',
  stav: f.Stav ?? 0, hotovo: f.Hotovo || null, poznamka: f.Poznamka || '', kontrolni: j(f.Kontrolni, []), odkazy: j(f.Odkazy, []), outlook: f.Outlook !== false, outlookId: f.OutlookId || '',
}; };
const ASG_MAP = { nazev: 'Title', ukolId: 'UkolId', vyskyt: 'Vyskyt', klic: 'Klic', osoba: 'Osoba', osobaJmeno: 'OsobaJmeno', popis: 'Popis',
  priorita: 'Priorita', termin: 'Termin', cas: 'Cas', zobrazitOd: 'ZobrazitOd', stitky: 'Stitky', zadal: 'Zadal', zadalJmeno: 'ZadalJmeno',
  typ: 'Typ', stav: 'Stav', hotovo: 'Hotovo', poznamka: 'Poznamka', kontrolni: 'Kontrolni', odkazy: 'Odkazy', outlook: 'Outlook', outlookId: 'OutlookId' };
function toAsg(patch) {
  const f = {};
  for (const [k, v] of Object.entries(patch)) {
    const col = ASG_MAP[k]; if (!col) continue;
    if (k === 'stitky') f[col] = (v || []).join('|');
    else if (k === 'kontrolni' || k === 'odkazy') f[col] = JSON.stringify(v || []);
    else if (k === 'termin' || k === 'zobrazitOd' || k === 'hotovo') f[col] = v ? iso(v) : null;
    else f[col] = v;
  }
  return f;
}

const fromPerson = (it) => { const f = it.fields;
  const roles = new Set([...(f.RoleSkupiny || '').split(','), ...(f.RoleNavic || '').split(',')].map((s) => s.trim()).filter((r) => ROLE_LABELS[r]));
  return { id: it.id, email: (f.Email || '').toLowerCase(), jmeno: f.Title || f.Email, roles: [...roles], roleSkupiny: (f.RoleSkupiny || '').split(',').filter(Boolean),
    roleNavic: (f.RoleNavic || '').split(',').filter(Boolean), tridnictvi: f.Tridnictvi || '', zastupce: f.Zastupce || '', aktivni: f.Aktivni !== false, videno: f.Videno };
};
const fromEvent = (it) => { const f = it.fields; return { id: it.id, nazev: f.Title, od: f.Od ? toLocalYmd(f.Od) : '', do: f.Do ? toLocalYmd(f.Do) : '', cas: f.Cas || '', typ: f.TypAkce || 'akce', zdroj: f.Zdroj || '' }; };

/* ---------- vytvoření úložiště ---------- */

export async function createSpStore(cfg) {
  const msal = await import(MSAL_URL);
  const redirectUri = cfg.redirectUri || (location.origin + location.pathname.replace(/index\.html$/, ''));
  const conf = {
    auth: { clientId: cfg.clientId, authority: `https://login.microsoftonline.com/${cfg.tenantId}`, redirectUri, navigateToLoginRequestUrl: false },
    cache: { cacheLocation: 'localStorage' },
  };
  const pca = msal.PublicClientApplication.createPublicClientApplication
    ? await msal.PublicClientApplication.createPublicClientApplication(conf)
    : new msal.PublicClientApplication(conf);
  if (!msal.PublicClientApplication.createPublicClientApplication && pca.initialize) await pca.initialize();
  const res = await pca.handleRedirectPromise().catch((e) => { console.warn(e); return null; });
  let account = res?.account || pca.getAllAccounts()[0] || null;
  if (account) pca.setActiveAccount(account);

  async function token() {
    try {
      return (await pca.acquireTokenSilent({ scopes: SCOPES, account })).accessToken;
    } catch (e) {
      if (e instanceof msal.InteractionRequiredAuthError || /interaction_required|consent_required|login_required/.test(e.errorCode || '')) {
        await pca.acquireTokenRedirect({ scopes: SCOPES, account });
      }
      throw e;
    }
  }

  async function graph(method, path, body, headers = {}, tries = 0) {
    const r = await fetch(path.startsWith('http') ? path : GRAPH + path, {
      method,
      headers: { Authorization: `Bearer ${await token()}`, ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    if ((r.status === 429 || r.status === 503) && tries < 4) {
      await new Promise((ok) => setTimeout(ok, (+r.headers.get('Retry-After') || 2) * 1000));
      return graph(method, path, body, headers, tries + 1);
    }
    if (r.status === 204) return null;
    const data = await r.json().catch(() => null);
    if (!r.ok) {
      const err = new Error(data?.error?.message || `Graph ${r.status}`);
      err.status = r.status; err.code = data?.error?.code;
      throw err;
    }
    return data;
  }
  async function graphAll(path, headers) {
    const out = [];
    let next = path;
    while (next) { const d = await graph('GET', next, null, headers); out.push(...(d.value || [])); next = d['@odata.nextLink']; }
    return out;
  }
  async function batch(reqs) {
    const results = [];
    for (let i = 0; i < reqs.length; i += 20) {
      const chunk = reqs.slice(i, i + 20).map((r, k) => ({ id: String(k), ...r, headers: r.body ? { 'Content-Type': 'application/json' } : undefined }));
      const d = await graph('POST', '/$batch', { requests: chunk });
      const sorted = (d.responses || []).sort((a, b) => +a.id - +b.id);
      const throttled = sorted.filter((x) => x.status === 429);
      if (throttled.length) {
        await new Promise((ok) => setTimeout(ok, 3000));
        const again = await batch(throttled.map((x) => reqs[i + +x.id]));
        throttled.forEach((x, n) => { sorted[sorted.indexOf(x)] = again[n]; });
      }
      results.push(...sorted);
    }
    return results;
  }

  /* ---------- web a seznamy ---------- */
  let siteId = null;
  const listIds = {};
  const listName = (k) => `${cfg.listPrefix || 'UU_'}${k}`;
  async function site() {
    if (siteId) return siteId;
    const u = new URL(cfg.siteUrl);
    const s = await graph('GET', `/sites/${u.hostname}:${u.pathname.replace(/\/$/, '')}?$select=id`);
    siteId = s.id;
    return siteId;
  }
  async function listId(k) {
    if (listIds[k]) return listIds[k];
    const s = await site();
    const d = await graph('GET', `/sites/${s}/lists?$select=id,displayName&$filter=displayName eq '${listName(k)}'`);
    if (!d.value?.length) { const e = new Error(`Na SharePointu chybí seznam ${listName(k)}. Správce ho vytvoří v Správa → Napojení.`); e.code = 'missingList'; throw e; }
    listIds[k] = d.value[0].id;
    return listIds[k];
  }
  const itemsPath = async (k) => `/sites/${await site()}/lists/${await listId(k)}/items`;
  async function items(k, filter) {
    const f = filter ? `&$filter=${encodeURIComponent(filter)}` : '';
    return graphAll(`${await itemsPath(k)}?$expand=fields&$top=999${f}`, PREFER);
  }

  /* ---------- přihlášený člověk ---------- */
  let meCache = null;
  async function me() {
    if (meCache) return meCache;
    const u = await graph('GET', '/me?$select=displayName,mail,userPrincipalName');
    const email = (u.mail || u.userPrincipalName).toLowerCase();
    const groups = await graphAll('/me/memberOf/microsoft.graph.group?$select=id,displayName&$top=999');
    const fromGroups = new Set(groups.map((g) => cfg.groupMap?.[g.displayName]).filter(Boolean));
    let person = null;
    try {
      const rec = (await items('Lide', `fields/Email eq '${odata(email)}'`))[0];
      if (rec) {
        person = fromPerson(rec);
        graph('PATCH', `${await itemsPath('Lide')}/${rec.id}/fields`, { Videno: iso(new Date()), RoleSkupiny: [...fromGroups].join(',') }).catch(() => {});
      } else if (fromGroups.size) {
        const it = await graph('POST', await itemsPath('Lide'), { fields: { Title: u.displayName, Email: email, RoleSkupiny: [...fromGroups].join(','), Aktivni: true, Videno: iso(new Date()) } });
        person = fromPerson(it);
      }
    } catch (e) { if (e.code !== 'missingList') throw e; }
    const roles = new Set([...fromGroups, ...(person?.roleNavic || [])]);
    if ((cfg.spravci || []).map((x) => x.toLowerCase()).includes(email)) roles.add('spravce');
    meCache = { ...(person || {}), id: person?.id, email, jmeno: u.displayName, roles, tridnictvi: person?.tridnictvi || '', zastupce: person?.zastupce || '' };
    if (meCache.tridnictvi) meCache.roles.add('tridni');
    if (meCache.zastupce) meCache.roles.add('zastupce');
    return meCache;
  }

  const store = {
    mode: 'sharepoint',
    get needsLogin() { return !account; },
    async login() { await pca.loginRedirect({ scopes: SCOPES, prompt: 'select_account' }); },
    async logout() { await pca.logoutRedirect({ account }); },
    me,
    async people() { return (await items('Lide')).map(fromPerson); },
    async savePerson(p) {
      const fields = { Title: p.jmeno, Email: p.email.toLowerCase(), RoleNavic: (p.roleNavic || []).join(','), Tridnictvi: p.tridnictvi || '',
        Zastupce: p.zastupce || '', Aktivni: p.aktivni !== false };
      const base = await itemsPath('Lide');
      if (p.id) { await graph('PATCH', `${base}/${p.id}/fields`, fields); return p; }
      return fromPerson(await graph('POST', base, { fields }));
    },
    async tasks() { return (await items('Ukoly')).map(fromTask); },
    async saveTask(t) {
      const base = await itemsPath('Ukoly');
      if (t.id) { await graph('PATCH', `${base}/${t.id}/fields`, toTask(t)); return t; }
      const it = await graph('POST', base, { fields: toTask({ ...t, vytvoreno: new Date().toISOString() }) });
      return fromTask(it);
    },
    async deleteTask(id) { await graph('DELETE', `${await itemsPath('Ukoly')}/${id}`); },
    async assignments(f = {}) {
      const parts = [];
      if (f.osoba) parts.push(`fields/Osoba eq '${odata(f.osoba)}'`);
      if (f.zadal) parts.push(`fields/Zadal eq '${odata(f.zadal)}'`);
      if (f.typ) parts.push(`fields/Typ eq '${odata(f.typ)}'`);
      if (f.ukolId) parts.push(`fields/UkolId eq '${odata(f.ukolId)}'`);
      if (f.fromTermin) parts.push(`fields/Termin ge '${iso(f.fromTermin)}'`);
      return (await items('Prirazeni', parts.join(' and '))).map(fromAsg);
    },
    async createAssignments(list) {
      if (!list.length) return [];
      const base = (await itemsPath('Prirazeni')).replace(GRAPH, '');
      const res = await batch(list.map((a) => ({ method: 'POST', url: base, body: { fields: toAsg(a) } })));
      return res.filter((r) => r.status < 300).map((r) => fromAsg(r.body));
    },
    async updateAssignments(list) {
      if (!list.length) return;
      const base = (await itemsPath('Prirazeni')).replace(GRAPH, '');
      await batch(list.map(({ id, patch }) => ({ method: 'PATCH', url: `${base}/${id}/fields`, body: toAsg(patch) })));
    },
    async deleteAssignments(ids) {
      if (!ids.length) return;
      const base = (await itemsPath('Prirazeni')).replace(GRAPH, '');
      await batch(ids.map((id) => ({ method: 'DELETE', url: `${base}/${id}` })));
    },
    async events() { return (await items('Akce')).map(fromEvent); },
    async addEvents(list) {
      const base = (await itemsPath('Akce')).replace(GRAPH, '');
      await batch(list.map((e) => ({ method: 'POST', url: base, body: { fields: {
        Title: e.nazev, Od: iso(new Date(`${e.od}T12:00:00`)), Do: iso(new Date(`${e.do || e.od}T12:00:00`)), Cas: e.cas || '', TypAkce: e.typ, Zdroj: e.zdroj || '' } } })));
    },
    async deleteEvents(ids) {
      const base = (await itemsPath('Akce')).replace(GRAPH, '');
      await batch(ids.map((id) => ({ method: 'DELETE', url: `${base}/${id}` })));
    },

    /* ---------- správa ---------- */
    async listStatus() {
      const s = await site();
      const d = await graph('GET', `/sites/${s}/lists?$select=id,displayName&$top=200`);
      const names = new Set(d.value.map((l) => l.displayName));
      return Object.keys(SCHEMA).map((k) => ({ key: k, name: listName(k), exists: names.has(listName(k)) }));
    },
    async createLists() {
      const s = await site();
      const status = await store.listStatus();
      for (const st of status) {
        if (!st.exists) {
          await graph('POST', `/sites/${s}/lists`, { displayName: st.name, columns: SCHEMA[st.key].map(colDef), list: { template: 'genericList' } });
          continue;
        }
        // u starších seznamů doplní sloupce přidané v nových verzích appky
        const id = (await graph('GET', `/sites/${s}/lists?$select=id&$filter=displayName eq '${st.name}'`)).value[0].id;
        const cols = new Set((await graphAll(`/sites/${s}/lists/${id}/columns?$select=name`)).map((c) => c.name));
        for (const def of SCHEMA[st.key]) if (!cols.has(def[0])) await graph('POST', `/sites/${s}/lists/${id}/columns`, colDef(def));
      }
      Object.keys(listIds).forEach((k) => delete listIds[k]);
    },
    /** Načte členy skupin M365 podle config.groupMap do seznamu Lidé. */
    async syncPeopleFromGroups() {
      const found = new Map();
      for (const [groupName, role] of Object.entries(cfg.groupMap || {})) {
        const g = await graph('GET', `/groups?$select=id,displayName&$filter=displayName eq '${odata(groupName)}'`);
        if (!g.value?.length) continue;
        const members = await graphAll(`/groups/${g.value[0].id}/transitiveMembers/microsoft.graph.user?$select=displayName,mail,userPrincipalName&$top=999`);
        for (const m of members) {
          const email = (m.mail || m.userPrincipalName || '').toLowerCase();
          if (!email) continue;
          const x = found.get(email) || { jmeno: m.displayName, roles: new Set() };
          x.roles.add(role);
          found.set(email, x);
        }
      }
      const existing = await store.people();
      const base = (await itemsPath('Lide')).replace(GRAPH, '');
      const reqs = [];
      for (const [email, x] of found) {
        const ex = existing.find((p) => p.email === email);
        const roleSkupiny = [...x.roles].join(',');
        if (ex) { if (ex.roleSkupiny.join(',') !== roleSkupiny) reqs.push({ method: 'PATCH', url: `${base}/${ex.id}/fields`, body: { RoleSkupiny: roleSkupiny } }); }
        else reqs.push({ method: 'POST', url: base, body: { fields: { Title: x.jmeno, Email: email, RoleSkupiny: roleSkupiny, Aktivni: true } } });
      }
      for (const ex of existing) if (!found.has(ex.email) && ex.roleSkupiny.length) reqs.push({ method: 'PATCH', url: `${base}/${ex.id}/fields`, body: { RoleSkupiny: '' } });
      await batch(reqs);
      return { celkem: found.size, zmen: reqs.length };
    },

    /* ---------- dokumenty v OneDrivu / SharePointu ---------- */
    /** Z vloženého odkazu (sdílení nebo adresa souboru) zjistí název a soubor v OneDrivu. */
    async resolveLink(url) {
      const b64 = btoa(unescape(encodeURIComponent(url))).replace(/=+$/, '').replace(/\//g, '_').replace(/\+/g, '-');
      const it = await graph('GET', `/shares/u!${b64}/driveItem?$select=id,name,webUrl,parentReference`);
      return { u: url, n: it.name, d: it.parentReference?.driveId, i: it.id };
    },
    /** Soubor přetažený z Průzkumníka dohledá ve vlastním OneDrivu podle názvu (a velikosti). */
    async findDriveFile(file) {
      const q = encodeURIComponent(file.name.replace(/'/g, "''"));
      const res = await graph('GET', `/me/drive/root/search(q='${q}')?$select=id,name,size,webUrl,parentReference,file&$top=50`);
      const same = (res.value || []).filter((x) => x.file && x.name.toLowerCase() === file.name.toLowerCase());
      // stejný název i velikost = ten samý soubor; jinak je to jiná verze a nahraje se
      const hit = same.find((x) => x.size === file.size);
      return hit ? { u: hit.webUrl, n: hit.name, d: hit.parentReference?.driveId, i: hit.id } : null;
    },
    /** Nahraje soubor do OneDrivu přihlášeného do složky „Úkolníček“ (stejný název = nový soubor, nic se nepřepíše). */
    async uploadFile(file, onProgress) {
      const path = `/me/drive/root:/${encodeURIComponent(cfg.uploadFolder || 'Úkolníček')}/${encodeURIComponent(file.name)}`;
      let item;
      if (file.size <= 4 * 1024 * 1024) {
        const r = await fetch(`${GRAPH}${path}:/content?@microsoft.graph.conflictBehavior=rename`, {
          method: 'PUT', headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': file.type || 'application/octet-stream' }, body: file,
        });
        if (!r.ok) throw new Error(`Nahrání se nepovedlo (${r.status}).`);
        item = await r.json();
        onProgress?.(100);
      } else {
        const sess = await graph('POST', `${path}:/createUploadSession`, { item: { '@microsoft.graph.conflictBehavior': 'rename' } });
        const CHUNK = 320 * 1024 * 32; // 10 MiB, násobek 320 KiB
        for (let start = 0; start < file.size; start += CHUNK) {
          const end = Math.min(start + CHUNK, file.size);
          let r; let tries = 0;
          do {
            r = await fetch(sess.uploadUrl, { method: 'PUT', headers: { 'Content-Range': `bytes ${start}-${end - 1}/${file.size}` }, body: file.slice(start, end) }).catch(() => null);
            if (r && (r.ok || r.status === 202)) break;
            await new Promise((ok) => setTimeout(ok, 1500 * ++tries));
          } while (tries < 4);
          if (!r || !(r.ok || r.status === 202)) throw new Error('Nahrání se přerušilo.');
          onProgress?.(Math.round((end / file.size) * 100));
          if (r.status === 200 || r.status === 201) item = await r.json();
        }
      }
      return { u: item.webUrl, n: item.name, d: item.parentReference?.driveId, i: item.id, nahrano: true };
    },
    /** Nasdílí soubory lidem z úkolu (bez e-mailové pozvánky, jen pro přihlášené ze školy). */
    async shareLinks(links, emails, role = 'read') {
      let ok = 0;
      for (const l of links) {
        if (!l.d || !l.i) continue;
        await graph('POST', `/drives/${l.d}/items/${l.i}/invite`, {
          recipients: emails.map((email) => ({ email })), requireSignIn: true, sendInvitation: false, roles: [role],
        });
        ok++;
      }
      return ok;
    },

    /* ---------- Outlook ---------- */
    /**
     * Srovná události v Outlooku přihlášeného člověka s jeho úkoly:
     * vytvoří chybějící, opraví změněné, u hotových vypne připomínku, smaže ty, jejichž úkol zmizel.
     */
    async syncOutlook(mine) {
      const now = startOfDay(new Date());
      const view = await graphAll(`/me/calendarView?startDateTime=${addDays(now, -14).toISOString()}&endDateTime=${addDays(now, 400).toISOString()}&$select=id,subject,start,isReminderOn,categories&$top=500`,
        { Prefer: 'outlook.timezone="Europe/Prague"' });
      const ours = new Map(view.filter((e) => (e.categories || []).includes('Úkolníček')).map((e) => [e.id, e]));
      const used = new Set();
      const asgPatches = [];
      let created = 0;
      for (const a of mine) {
        if (!a.outlook) continue;
        const done = a.stav === 2;
        const subject = `${done ? 'Hotovo' : PRIORITY[a.priorita]?.label || 'Úkol'} – ${a.nazev}`;
        const ev = a.outlookId && ours.get(a.outlookId);
        const d = new Date(a.termin);
        const p2 = (n) => String(n).padStart(2, '0');
        const day = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
        const nextDay = addDays(d, 1);
        const nd = `${nextDay.getFullYear()}-${p2(nextDay.getMonth() + 1)}-${p2(nextDay.getDate())}`;
        const start = a.cas ? `${day}T${a.cas}:00` : `${day}T00:00:00`;
        const end = a.cas ? (() => { const e = new Date(d.getTime() + 15 * 60000); return `${day}T${p2(e.getHours())}:${p2(e.getMinutes())}:00`; })() : `${nd}T00:00:00`;
        const body = {
          subject, isAllDay: !a.cas, showAs: 'free', categories: ['Úkolníček'],
          isReminderOn: !done, reminderMinutesBeforeStart: reminderMinutes(a),
          start: { dateTime: start, timeZone: 'Europe/Prague' }, end: { dateTime: end, timeZone: 'Europe/Prague' },
          body: { contentType: 'text', content: `${a.popis || ''}\n\nZadal(a): ${a.zadalJmeno || ''}\nOtevřít Úkolníček: ${cfg.appUrl || location.href}` },
        };
        if (ev) {
          used.add(ev.id);
          const evStart = (ev.start?.dateTime || '').slice(0, 16);
          if (ev.subject !== subject || evStart !== start.slice(0, 16) || ev.isReminderOn === done) {
            await graph('PATCH', `/me/events/${ev.id}`, body).catch(() => {});
          }
        } else if (!done && new Date(a.termin) >= now) {
          const e = await graph('POST', '/me/events', body).catch(() => null);
          if (e) { asgPatches.push({ id: a.id, patch: { outlookId: e.id } }); used.add(e.id); created++; }
        }
      }
      for (const [id] of ours) if (!used.has(id)) await graph('DELETE', `/me/events/${id}`).catch(() => {});
      await store.updateAssignments(asgPatches);
      return { created };
    },
  };
  return store;
}
