# Úkolníček učitele

Webová aplikace (PWA) pro ZŠ Karla Hašlera Libčice nad Vltavou: **co je potřeba udělat a kdy**. Každý učitel, asistent, člen vedení i provozu vidí jen to, co je teď na řadě – a ve správný moment mu to připomene Outlook a pondělní e-mail.

- úkoly pro sebe, pro kolegu, společné a plošné (na role)
- rychlost **gepard = do zítra, zajíc = do konce týdne, šnek = do konce měsíce** – rychlost sama navrhne termín
- **Práce na úkolu**: ťukneš na úkol a tam měníš stav (nezačato / rozpracováno / hotovo), odškrtáváš kroky, píšeš poznámku a posouváš termín (i na libovolné datum z kalendáře). Na seznamu se stav kliknutím změnit nedá, aby se nic neoznačilo omylem
- **kroky** jdou přidávat, odebírat a přesouvat za úchyt se dvěma tečkami – myší, prstem i šipkami na klávesnici
- **dokumenty a odkazy** k úkolu: přetáhneš soubor ze složky OneDrive v Průzkumníku, nebo vložíš odkaz. U úkolů s více lidmi appka upozorní, že je potřeba dokument nasdílet, a umí ho nasdílet jedním tlačítkem
- **státní svátky** (i pohyblivé Velikonoce) si appka spočítá sama pro každý rok, upozorní na blížící se volno a opakované úkoly je přeskakují; **jmeniny** a **mezinárodní dny** jdou vypnout v Nastavení
- úkoly se objeví až v pravý čas (výkaz poslední týden v měsíci) a opakují se
- opakované úkoly přeskakují prázdniny a volna z harmonogramu
- hotové se schovají, dají se dohledat
- kdo zadal, vidí, kdo má hotovo, a jedním tlačítkem připomene ostatním
- import akcí a úkolů z CSV (harmonogram, zápisy z porad)
- zápis do Outlook kalendáře, týdenní souhrn e-mailem

Běží na **GitHub Pages**, přihlašuje se **školním účtem Microsoft 365**, data jsou na **školním SharePointu** (zůstávají v organizaci).

---

## Rychlá ukázka

V `config.js` je `mode: 'demo'`. Appka v tom případě nic nepotřebuje – data jsou jen v prohlížeči a v **Nastavení → Vyzkoušet jako** se přepneš do role třídní učitelky, vedení nebo hospodářky. Takhle ji můžeš ukázat kolegům ještě před napojením.

---

## Nasazení krok za krokem

Počítej asi s hodinou. Všechno děláš jako správce školního Microsoft 365.

### Krok 1 – GitHub Pages

1. Na GitHubu založ nový repozitář, `Ukolnicek-ucitele` (může být veřejný – žádná data ani hesla v něm nejsou).
2. Nahraj do něj **celý obsah** této složky (tlačítko *Add file → Upload files*, přetáhni všechno včetně složek).
3. *Settings → Pages → Build and deployment*: Source **Deploy from a branch**, Branch **main**, složka **/ (root)** → *Save*.
4. Za minutu poběží na `https://tadeasfirich.github.io/ukolnicek-ucitele/`. Tuhle adresu budeš potřebovat v kroku 2.

### Krok 2 – Registrace aplikace v Microsoft Entra ID

1. Otevři [entra.microsoft.com](https://entra.microsoft.com) → **Identita → Aplikace → Registrace aplikací → Nová registrace**.
2. Název: `Úkolníček učitele`. Podporované typy účtů: **Jenom účty v tomto organizačním adresáři**.
3. Identifikátor URI pro přesměrování: platforma **Jednostránková aplikace (SPA)**, adresa `https://tadeasfirich.github.io/ukolnicek-ucitele/` (přesně takhle – malými písmeny a s lomítkem na konci) → **Zaregistrovat**.
4. Na stránce *Přehled* si opiš **ID aplikace (klienta)** a **ID adresáře (tenanta)**.
5. **Oprávnění rozhraní API → Přidat oprávnění → Microsoft Graph → Delegovaná oprávnění** a zaškrtni:
   - `User.Read`
   - `Sites.ReadWrite.All`
   - `Calendars.ReadWrite`
   - `GroupMember.Read.All`
   - `Files.ReadWrite.All` (dokumenty z OneDrivu a jejich sdílení kolegům)
6. Klikni na **Udělit souhlas správce pro …** (bez toho by se každý učitel musel ptát na souhlas a `GroupMember.Read.All` by nefungovalo).

> Návod Microsoftu: [Registrace jednostránkové aplikace](https://learn.microsoft.com/entra/identity-platform/scenario-spa-app-registration)

### Krok 3 – SharePoint web pro data

1. V SharePointu vytvoř nový web (týmový web bez Teams stačí), např. `Úkolníček` → adresa bude `https://NAZEV.sharepoint.com/sites/ukolnicek`.
2. **Nastavení webu → Oprávnění webu**: skupině **Zaměstnanci** dej oprávnění **Upravovat**. Žáci se tam nesmí dostat – proto ne „Všichni kromě externích uživatelů“.
3. Nic dalšího nezakládej, seznamy vytvoří appka sama (krok 6).

### Krok 4 – Skupiny Microsoft 365

Appka pozná roli podle skupiny, ve které člověk je:

| Skupina M365 | Role v appce |
|---|---|
| Kantoři | Učitel |
| Asistentky | Asistent |
| Vedení | Vedení |
| Provoz | Provoz |

Skupinu **Provoz** pravděpodobně nemáte – založ ji v [admin.microsoft.com](https://admin.microsoft.com) (*Týmy a skupiny → Aktivní týmy a skupiny → Přidat skupinu*, typ *Zabezpečení* stačí) a dej do ní hospodářku, ekonoma a vedoucí ŠJ. Uklízečky a kuchařky do ní nedávej – úkoly nedostávají.

**Třídní učitele a zástupce** nenastavuješ ve skupinách, ale přímo v appce (krok 6) – mění se každý rok.

Kdo není v žádné z těchto skupin (třeba žáci), uvidí jen hlášku „Sem nemáš přístup“.

### Krok 5 – config.js

Otevři na GitHubu soubor `config.js` (ikona tužky) a vyplň:

```js
mode: 'sharepoint',
clientId: 'ID aplikace z kroku 2',
tenantId: 'ID adresáře z kroku 2',
siteUrl: 'https://NAZEV.sharepoint.com/sites/ukolnicek',
appUrl: 'https://tadeasfirich.github.io/ukolnicek-ucitele/',
spravci: ['tvuj.email@skola.libcice.cz'],
```

Zkontroluj, že **názvy skupin v `groupMap` přesně odpovídají** názvům ve vašem M365 (včetně velkých písmen a háčků). Ulož (*Commit changes*).

### Krok 6 – První spuštění (jako správce)

1. Otevři appku a přihlas se. Appka ohlásí, že chybí seznamy → **Vytvořit seznamy teď**. Vzniknou čtyři: `UU_Ukoly`, `UU_Prirazeni`, `UU_Lide`, `UU_Akce`.
2. **Správa (štít nahoře) → Lidé a role → Načíst lidi ze skupin M365.**
3. Ťukni postupně na třídní učitele a vyplň **Třídní učitel třídy** (např. `7.A`), u zástupců **Zástupce třídního**.
4. **Správa → Import**:
   - *Vybrat CSV s akcemi* → `data/akce-2026-27.csv` (celý harmonogram 2026/27) → *Nahrát vybrané*
   - *Vybrat CSV s úkoly* → `data/ukoly-navrh-2026-27.csv` → odškrtni, co u vás neplatí → *Nahrát vybrané*

Hotovo. Pošli kolegům odkaz a ukaž jim, jak si appku přidat na plochu (*Nastavení → Mít po ruce*).

### Krok 7 – Týdenní souhrn e-mailem (Power Automate)

Každé pondělí ráno dostane každý e-mail se svými úkoly na týden (včetně těch po termínu).

1. [make.powerautomate.com](https://make.powerautomate.com) → **Vytvořit → Naplánovaný tok v cloudu**. Název `Úkolníček – týdenní souhrn`, opakovat **každý 1 týden**, **pondělí**, **6:30**, časové pásmo *(UTC+01:00) Bělehrad, Bratislava, Budapešť, Lublaň, Praha*.
2. **SharePoint – Získat položky**: web = Úkolníček, seznam = `UU_Lide`, Dotaz filtru: `Aktivni eq 1`.
3. **Použít na každou položku** (výstup `value` z předchozího kroku). Uvnitř:
   1. **SharePoint – Získat položky**, seznam `UU_Prirazeni`, Dotaz filtru:
      ```
      Osoba eq '@{toLower(items('Použít_na_každou_položku')?['Email'])}' and Stav lt 2 and ZobrazitOd le '@{addDays(utcNow(), 7)}' and Termin le '@{addDays(utcNow(), 7)}'
      ```
      Řadit podle: `Termin`.
   2. **Podmínka**: `length(body('Získat_položky_2')?['value'])` je větší než `0`.
   3. V části *Ano*: **Vybrat** (Data Operations) z `value`, mapování:
      - `Úkol` → `item()?['Title']`
      - `Do kdy` → `formatDateTime(convertFromUtc(item()?['Termin'], 'Central Europe Standard Time'), 'd. M. HH:mm')`
      - `Priorita` → `item()?['Priorita']`
   4. **Vytvořit tabulku HTML** z výstupu *Vybrat*.
   5. **Office 365 Outlook – Odeslat e-mail (V2)**: Komu `Email`, Předmět `Úkolníček: tvoje úkoly na tento týden`, Text: tabulka + odkaz na appku.
4. Ulož a dej **Test → Ručně**.

> Názvy kroků v závorkách (`Použít_na_každou_položku`, `Získat_položky_2`) se mohou u tebe lišit – vlož je raději přes *Dynamický obsah*, než abys je psal ručně.

---

## Jak to funguje uvnitř

**Úkol a přiřazení.** Úkol (`UU_Ukoly`) je zadání: co, do kdy, pro koho, jak se opakuje. Appka z něj rozepíše konkrétní **přiřazení** (`UU_Prirazeni`) – jedno pro každého člověka a každý termín. Plošný úkol pro „Učitele“ tak má 20 přiřazení a zadavatel vidí, kdo má hotovo.

**Kdy se rozepisuje.** Jakmile kdokoli otevře appku (jednou denně), rozepíše úkoly všem na 21 dní dopředu. Po uložení nového úkolu hned. Když se někdo stane třídním, dostane úkoly třídních při dalším rozpisu (správce to může spustit hned ve *Správa → Napojení*).

**Kdy se úkol ukáže.** `zobrazit_dni_predem` – do té doby úkol nikoho neruší, je vidět jen v Kalendáři.

**Opakování.**
- `tydne` – každý týden ve stejný den; o prázdninách a ředitelském volnu se vynechá
- `mesicne` – stejné datum; padne-li na volno, posune se na předchozí pracovní den
- `posledni-v-mesici` – poslední pátek (podle dne prvního termínu); padne-li na prázdniny, posune se na poslední pracovní den před nimi; v létě se vynechá

**Outlook.** Appka každému zapíše jeho úkoly do kalendáře s připomínkou **ráno v 7:30 den před termínem**. Hotový úkol přepíše na „Hotovo – …“ a připomínku vypne, smazaný úkol z kalendáře odstraní. Funguje pro každého, kdo appku aspoň jednou otevřel.

**Kdo smí co.**

| | Pro sebe | Pro kolegu / společně | Plošně na role | Lidé a role, import |
|---|---|---|---|---|
| Učitel, asistent, provoz | ano | ano | – | – |
| Vedení | ano | ano | ano | – |
| Správce | ano | ano | ano | ano |

Plošný úkol „Všichni pedagogové“ provoz nedostane. Provozu ho dáš zvlášť (role *Provoz*) nebo přes *Úplně všichni*.

---

## Na co myslet

- **Bezpečnost dat.** Kdo má na SharePoint webu oprávnění Upravovat, technicky může měnit i cizí řádky (appka mu to nenabídne, ale přes SharePoint by šlo). Pro školní úkoly je to rozumný kompromis; do popisů úkolů nepiš citlivé údaje o žácích.
- **Rozpis závisí na tom, že appku někdo otevře.** Ve škole s desítkami lidí to nastane každý den. Kdyby přes prázdniny nikdo, rozepíše se první den po nich.
- **Napojení na Microsoft nebylo vyzkoušeno na vašem tenantu.** Ukázkový režim je otestovaný, ostrý režim je napsaný podle dokumentace Microsoft Graph. Při prvním spuštění sleduj, jestli se seznamy vytvoří a lidé načtou – kdyby něco hlásilo chybu, pošli mi ji.
- **Knihovna pro přihlášení** se načítá z cdn.jsdelivr.net (MSAL 5.27.0). Pokud by ji školní síť blokovala, stáhni ji do repozitáře a změň adresu v `js/store-sp.js`.

---

## Dokumenty z OneDrivu

- **Na počítači:** soubor přetáhni do pole *Dokumenty a odkazy*. Prohlížeč appce neprozradí, kde soubor leží – appka ho proto nejdřív hledá ve tvém OneDrivu podle názvu a velikosti. Když ho najde, uloží odkaz, který se otevře v Office na webu. Když ho tam nenajde (soubor ze *Stažených*, z cizího počítače, nebo je to jiná verze), **nahraje ho do tvého OneDrivu do složky Úkolníček** a uloží odkaz na něj. Nic se nepřepisuje – soubor se stejným názvem dostane číslo. U souborů nad 100 MB se appka nejdřív zeptá, protože zaberou víc místa.
- **Na mobilu a tabletu:** v aplikaci OneDrive u souboru *⋯ → Sdílet → Kopírovat odkaz* a odkaz vlož.
- **Sdílení:** dokument z tvého OneDrivu vidíš jen ty. U úkolu s dalšími lidmi appka ukáže upozornění a tlačítko **Sdílet s nimi** – nasdílí soubor všem z úkolu (u společného úkolu s úpravami, jinak jen ke čtení), bez otravných e-mailů. Pod tlačítkem *Jak sdílet ručně* je návod pro Průzkumník i mobil.
- Odkaz přidaný zadavatelem dostanou všichni, kdo úkol mají. Odkaz přidaný někým jiným je jen jeho (u společného úkolu všech řešitelů).

## Svátky, jmeniny a mezinárodní dny

Všechno je zabudované přímo v appce (`js/dny.js`) a počítá se v zařízení – funguje bez internetu, pro jakýkoli rok a appka se nikde na nic neptá. Pevné státní svátky jsou daty v zákoně, Velký pátek a Velikonoční pondělí se počítají z data Velikonoc. Jmeniny jsou občanský kalendář ČR. Mezinárodní dny jsou výběr užitečný pro školu (např. Den učitelů 28. 3., Mezinárodní den matematiky 14. 3., Den bezpečnějšího internetu); další přidáš do seznamu `INTL_FIXED` v `js/dny.js`.

## Z jakého výzkumu návrh vychází

- **Konkrétní plán „kdy a kde“** zvyšuje šanci, že člověk úkol udělá (metaanalýza 94 studií, Gollwitzer & Sheeran 2006, d = 0,65). Proto u osobních úkolů pole *Kdy a kde na tom budu pracovat?*
- **Rozpracovaný úkol s plánem přestane „vrtat hlavou“** (Masicampo & Baumeister 2011). Proto stav *rozpracováno* a kroky.
- **Externí připomínky výrazně pomáhají splnit odložené záměry** (přehled Gilbert a kol. 2022). Proto Outlook a souhrn.
- **Upozornění v dávkách** (pár za den) snižují stres oproti průběžnému pípání; úplné vypnutí naopak zvyšuje obavu, že něco uteče (Fitz a kol. 2019). Proto jedna ranní připomínka a jeden týdenní souhrn, žádné neustálé notifikace.
- **Lidé dělají naléhavé místo důležitého** (mere urgency effect, Zhu, Yang & Hsee 2018). Proto je priorita oddělená od termínu a úkoly se ukazují až v pravý čas, ne všechny najednou.
- **Malé viditelné pokroky motivují nejvíc** (Amabile & Kramer, ~12 000 deníkových záznamů). Proto lišta *Tento týden hotovo X z Y*.
- Od nejlepších aplikací (Things 3, Todoist) je převzato oddělení **„kdy se úkol objeví“ od „do kdy“** a schovávání hotových.

---

## Soubory

| Soubor | K čemu |
|---|---|
| `config.js` | **jediné, co upravuješ** |
| `index.html`, `css/app.css` | vzhled |
| `js/app.js` | obrazovky a ovládání |
| `js/core.js` | role, opakování, rozpis úkolů |
| `js/store-demo.js` | ukázkový režim |
| `js/store-sp.js` | přihlášení Microsoft, SharePoint, Outlook |
| `js/csv.js` | import a export CSV |
| `data/akce-2026-27.csv` | harmonogram školního roku 2026/27 |
| `data/ukoly-navrh-2026-27.csv` | návrh úkolů z harmonogramu (proškrtej) |
| `sw.js`, `manifest.webmanifest`, `icons/` | instalace na plochu, běh bez signálu |

Nový harmonogram nebo zápis z porady převedeš do CSV tak, že ho dáš Claudovi se zadáním z *Správa → Import → Zadání pro Clauda*.
