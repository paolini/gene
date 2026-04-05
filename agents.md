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
- Auth: Auth.js per Next.js (`next-auth`) con Google OAuth
- Graph/tree view: React Flow
- DB: MongoDB + Mongoose
- Import: script `scripts/importGedcom.js`

Implemented features:
- Ricerca individui nella home (`pages/index.js`); se la casella di ricerca e' vuota non mostra risultati.
- Formattazione nomi GEDCOM lato UI: `Nome /Cognome/` viene reso senza slash, con cognome in evidenza e metadati inline (sesso, nascita, morte).
- Autenticazione Google con sessione applicativa e persistenza utenti in MongoDB.
- Accesso ai dati genealogici consentito solo a utenti autenticati con ruolo esplicito (`guest`, `editor`, `admin`); utenti senza ruolo vengono indirizzati a una pagina di attesa autorizzazione.
- Flusso inviti per assegnazione ruolo: creazione inviti, link di redemption e assegnazione del ruolo ad account autenticati senza ruolo.
- Pagina admin utenti (`pages/admin/users.js`) per visualizzare utenti, cambiare ruolo e gestire inviti (`UserInvitation`).
- Pagina dettaglio individuo (`pages/person/[id].js`) semplificata: famiglie in colonna, senza GEDCOM id visibili, con accesso alla vista albero tramite icona `🌳` nell'angolo alto destro.
- Pagina albero persona (`pages/tree/person/[id].js`) con vista client-side basata su React Flow, nodi persona cliccabili, foto flottante nella card e controlli `Espandi` esterni: genitori sopra il nodo, famiglie/figli sotto il nodo.
- Vista albero con connettori spouse-family corretti: aggancio laterale coerente, archi diretti verso il nodo famiglia, figli espansi senza pannello genitori, coniugi con pannello genitori disponibile.
- Layout albero person-centered con pipeline separata tra modello semantico, placement deterministico e proiezione React Flow (`lib/personTreeModel.js`, `lib/personTreeLayout.js`, `lib/personTreeReactFlow.js`), con `family` come nodo connettore tra coniugi e figli.
- Mutation GraphQL di scrittura protetta da ruolo esplicito (`editor` o `admin` per `addPerson`).
- Query e mutation GraphQL admin per utenti e inviti: `currentUser`, `users`, `userInvitations`, `setUserRole`, `createUserInvitation`, `setUserInvitationActive`, `redeemUserInvitation`.
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
- `api-agent`: evolve lo schema GraphQL, resolver, query per albero genealogico, auth/admin e import.
  - Queries attuali:
    - `persons`
    - `person(id)`
    - `families`
    - `family(id)`
    - `currentUser`
    - `users`
    - `userInvitations`
  - Mutations attuali:
    - `addPerson(input)`
    - `setUserRole(userId, role)`
    - `createUserInvitation(role, isReusable)`
    - `setUserInvitationActive(invitationId, isActive)`
    - `redeemUserInvitation(token)`
- `ui-agent`: migliora la ricerca, il dettaglio persona e la vista albero persona React Flow.
- `data-agent`: mantiene modelli Mongoose, validazione GEDCOM, mapping GEDCOM ↔ MongoDB e modello `UserInvitation`.
- `sync-agent` (optional): gestisce WebSocket e conflitti semplici (last-write-wins o CRDT).

Security & auth
- I dati genealogici sono privati: utenti non autenticati non devono poter accedere ne' via UI ne' via GraphQL.
- L'autenticazione da sola non basta: ogni utente deve avere un ruolo esplicito (`guest`, `editor`, `admin`).
- `guest` puo' leggere; `editor` puo' leggere e scrivere; `admin` puo' gestire anche i ruoli utente.

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
  - `/models/User.js` — modello utente autenticato
  - `/models/UserInvitation.js` — modello inviti per assegnazione ruolo
  - `/lib/auth.js` — configurazione Auth.js / Google OAuth
  - `/lib/personName.js` — rendering/formatting nomi GEDCOM lato UI
  - `/lib/personTreeModel.js` — modello semantico dell'albero persona/famiglia
  - `/lib/personTreeLayout.js` — placement deterministico dei nodi dell'albero
  - `/lib/personTreeReactFlow.js` — proiezione nodi/archi per React Flow
  - `/pages/index.js` — ricerca individui
  - `/pages/_app.js` — bootstrap session provider client-side
  - `/pages/api/auth/[...nextauth].js` — endpoint auth Google
  - `/pages/admin/users.js` — amministrazione utenti e inviti
  - `/pages/invite/[token].js` — redemption invito e assegnazione ruolo
  - `/pages/person/[id].js` — dettaglio individuo
  - `/pages/tree/person/[id].js` — vista albero persona con React Flow
  - `/components/tree/PersonTreeNode.js` — componenti nodo React Flow per persone e famiglie
  - `/scripts/importGedcom.js` — import GEDCOM
  - `/scripts/createUserInvitation.js` — utility CLI per creare inviti utente
  - `/lib/mongodb.js` — bootstrap MongoDB

Known gaps / next steps:
1. Rifinire ulteriormente il layout person-centered deterministico; la base attuale funziona ma puo' essere resa piu' robusta su alberi grandi o sbilanciati.
2. Valutare un indicatore visivo migliore per distinguere i nodi caricati per ascendenza rispetto a quelli caricati da una espansione discendente.
3. Estendere gli strumenti admin con workflow piu' completi (filtri, audit, revoca/rotazione inviti, eventuale gestione self-service dei ruoli).
4. Esporre in GraphQL campi GEDCOM aggiuntivi gia' importati (`occupations`, `titles`, `associations`).
5. Valutare editing di persone/famiglie; al momento l'input di creazione individuo e' stato rimosso dalla home.

Working assumptions for the next session:
- Usare approccio client-side per l'albero espandibile.
- Trattare `Person` come nodo centrale della vista ad albero; le famiglie spouse vivono dentro la card persona.
- Mostrare i controlli dei genitori nell'albero solo quando il nodo e' nel contesto corretto (radice, antenati, coniugi), non sui figli caricati da espansione discendente.
- Evitare di reintrodurre `gene.ged` nel repository.
