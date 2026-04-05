# Agents and Project Overview

Project: Genealogical Tree Web Server

Purpose:
- Visualizzare, navigare e modificare un albero genealogico a partire da file GEDCOM (`.ged`).
- Fornire API GraphQL e interfaccia web per consultazione, modifica e import/export.

High-level components:
- Web API (backend): GraphQL Yoga su Next.js, persistenza MongoDB, validazione GEDCOM.
- Frontend SPA: pagine Next.js con ricerca individui, dettaglio persona e vista albero centrata sulla persona.
- Data layer: MongoDB con modelli `Person` e `Family`; import GEDCOM -> JSON -> MongoDB.
- Realtime sync: non ancora implementato.

Current stack:
- Framework: Next.js 16 (`pages` router)
- API: GraphQL Yoga su `/api/graphql`
- Frontend: React 19
- Graph/tree view: React Flow
- DB: MongoDB + Mongoose
- Import: script `scripts/importGedcom.js`

Implemented features:
- Ricerca individui nella home (`pages/index.js`); se la casella di ricerca e' vuota non mostra risultati.
- Pagina dettaglio individuo (`pages/person/[id].js`) con link navigabili a genitori, figli, fratelli e famiglie.
- Pagina albero persona (`pages/tree/person/[id].js`) con vista client-side basata su React Flow.
- Import GEDCOM rigoroso con:
  - parsing di `INDI` e `FAM`
  - export intermedio JSON in `data/gedcom.json`
  - validazione tag supportati
  - validazione coerenza `FAMS`/`FAMC` <-> `HUSB`/`WIFE`/`CHIL`
  - import in MongoDB
- Logging connessione MongoDB in `lib/mongodb.js`.

Repository notes:
- `gene.ged` NON deve essere tracciato da Git; e' ignorato in `.gitignore` ed e' stato rimosso dalla history Git.
- Il remote `origin/main` e' stato aggiornato con force-push dopo la riscrittura della history.
- Potrebbero esserci modifiche locali non ancora committate; controllare sempre `git status --short` prima di operazioni Git.

Agent roles and responsibilities
- `api-agent`: evolve lo schema GraphQL, resolver, query per albero genealogico e import.
  - Queries attuali:
    - `persons`
    - `person(id)`
    - `families`
    - `family(id)`
- `ui-agent`: migliora la ricerca, il dettaglio persona e la vista albero persona React Flow.
- `data-agent`: mantiene modelli Mongoose, validazione GEDCOM, mapping GEDCOM ↔ MongoDB.
- `sync-agent` (optional): gestisce WebSocket e conflitti semplici (last-write-wins o CRDT).

Security & auth
- Implementare autenticazione minima (sessione o token) per operazioni di scrittura.
- Considerare ruoli: reader/editor/admin.

Import/Export
- Supporto nativo per importazione GEDCOM; logging delle discrepanze e report di mapping.
- Il comando corrente e': `npm run import:ged`
- Lo script legge automaticamente `.env.local` / `.env`
- Richiede `MONGODB_URI` per importare in MongoDB; senza URI genera solo il JSON intermedio.

Development & run
- File/dir rilevanti:
  - `/pages/api/graphql.js` — endpoint GraphQL Yoga
  - `/graphql/schema.js` — schema e resolver GraphQL
  - `/models/Person.js` — modello persona
  - `/models/Family.js` — modello famiglia
  - `/pages/index.js` — ricerca individui
  - `/pages/person/[id].js` — dettaglio individuo
  - `/pages/tree/person/[id].js` — vista albero persona con React Flow
  - `/scripts/importGedcom.js` — import GEDCOM
  - `/lib/mongodb.js` — bootstrap MongoDB

Known gaps / next steps:
1. Migliorare il layout automatico del grafo React Flow person-centered; attualmente il posizionamento e' semplice.
2. Rendere cliccabili anche i nodi persona direttamente dentro React Flow.
3. Esporre in GraphQL campi GEDCOM aggiuntivi gia' importati (`occupations`, `titles`, `associations`).
4. Valutare editing di persone/famiglie; al momento l'input di creazione individuo e' stato rimosso dalla home.
5. Eventuale commit/push delle modifiche locali residue dopo aver controllato `git status`.

Working assumptions for the next session:
- Usare approccio client-side per l'albero espandibile.
- Trattare `Person` come nodo centrale della vista ad albero; le famiglie spouse vivono dentro la card persona.
- Evitare di reintrodurre `gene.ged` nel repository.
