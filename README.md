# Genealogical Tree — Next.js + GraphQL Yoga + MongoDB

Minimal scaffold to view and edit a GEDCOM-based genealogical tree using Next.js (frontend), a GraphQL Yoga API, and MongoDB for persistence.

Quick start

1. Copy `.env.example` to `.env.local` and set `MONGODB_URI`.

2. Install and run:

```bash
npm install
npm run dev
```

3. Open http://localhost:3000

Notes
- API endpoint: `POST /api/graphql`
- The project contains a simple `Person` model and GraphQL queries/mutations to list and create persons.
