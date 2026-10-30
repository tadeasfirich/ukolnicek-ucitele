// =====================================================================
//  Úkolníček – nastavení. Tohle je jediný soubor, který upravuješ.
//  Postup, kde vzít jednotlivé hodnoty, je v README.md.
// =====================================================================
window.UKOLNICEK_CONFIG = {
  // "demo" = ukázka, data jen v prohlížeči.  "sharepoint" = ostrý provoz.
  mode: 'demo',

  schoolName: 'Základní škola Karla Hašlera Libčice nad Vltavou',
  schoolShort: 'Úkolníček – ZŠ K. Hašlera',

  // Z registrace aplikace v Microsoft Entra ID (README, krok 2)
  clientId: '00000000-0000-0000-0000-000000000000',
  tenantId: '00000000-0000-0000-0000-000000000000',

  // Adresa SharePoint webu, kam se ukládají data (README, krok 3)
  siteUrl: 'https://NAZEV.sharepoint.com/sites/ukolnicek',
  listPrefix: 'UU_',

  // Adresa, kde appka běží (GitHub Pages) – pro odkazy v Outlooku a e-mailech
  appUrl: 'https://tadeasfirich.github.io/Ukolnicek-ucitele/',

  // Kdo je správce (vidí Správu, smí všechno)
  spravci: ['tadeas.firich@skola.libcice.cz'],

  // Skupina Microsoft 365 (přesný název) → role v appce
  groupMap: {
    'Kantoři': 'ucitel',
    'Asistentky': 'asistent',
    'Vedení': 'vedeni',
    'Provoz': 'provoz',
  },
};
