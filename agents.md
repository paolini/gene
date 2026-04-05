# Agents and Project Overview

Project: Genealogical Tree Web Server

Purpose:
- Visualizzare, navigare e modificare un albero genealogico a partire da file GEDCOM (`.ged`).
- Fornire API REST e interfaccia web per consultazione, modifica e import/export.

High-level components:
- Web API (backend): serve dati genealogici, gestisce persistenze e validazione GEDCOM.
- Frontend SPA: visualizzazione interattiva dell'albero, editor nodi, timeline e ricerca.
- Data layer: storage (SQLite/JSON/DB a scelta) + import/export GEDCOM.
- Realtime sync: opzionale WebSocket/Server-Sent Events per aggiornamenti live.

Suggested tech stack (opzionale):
- Backend: Node.js + Express (o Python Flask/FastAPI) con endpoint JSON.
- Frontend: React (o Svelte/Vue) + D3/vis.js per grafico ad albero.
- DB: SQLite per semplicità, PostgreSQL per scalabilità.

Agent roles and responsibilities
- `api-agent`: implementa gli endpoint REST, validazione, parsing GEDCOM.
  - Endpoints example:
    - `GET /api/tree` — restituisce l'albero completo o frammenti
    - `GET /api/person/:id` — dettaglio persona
    - `POST /api/person` — crea persona
    - `PUT /api/person/:id` — aggiorna persona
    - `DELETE /api/person/:id` — rimuove persona
    - `POST /api/import` — carica file GEDCOM
    - `GET /api/export` — esporta GEDCOM
- `ui-agent`: UI/UX per visuale ad albero, form di modifica, undo/redo locale.
- `data-agent`: gestisce persistenza, mapping GEDCOM ↔ modello interno, migrazioni.
- `sync-agent` (optional): gestisce WebSocket e conflitti semplici (last-write-wins o CRDT).

Security & auth
- Implementare autenticazione minima (sessione o token) per operazioni di scrittura.
- Considerare ruoli: reader/editor/admin.

Import/Export
- Supporto nativo per importazione GEDCOM; logging delle discrepanze e report di mapping.

Development & run
- Repository layout suggestion:
  - `/server` — backend
  - `/client` — frontend
  - `/data` — sample GEDCOM files

Next steps (suggested):
1. Scegliere stack preferito (Node/Python, DB)
2. Scaffoldare repo con endpoint minimal e UI demo
3. Implementare parser GEDCOM e import di esempio

If you want, I can scaffold a minimal backend + frontend prototype and add README with run instructions.
