# Genealogical Tree — Next.js + GraphQL Yoga + MongoDB

Minimal scaffold to view and edit a GEDCOM-based genealogical tree using Next.js (frontend), a GraphQL Yoga API, and MongoDB for persistence.

Quick start

1. Copy `.env.example` to `.env.local` and set `MONGODB_URI`.

2. For Google authentication, also configure:

```bash
AUTH_SECRET=replace-with-a-long-random-string
AUTH_GOOGLE_ID=your-google-oauth-client-id
AUTH_GOOGLE_SECRET=your-google-oauth-client-secret
```

	In Google Cloud Console, add this authorized redirect URI:

```bash
http://localhost:3000/api/auth/callback/google
```

3. Install and run:

```bash
npm install
npm run dev
```

3. Open http://localhost:3000

Import process

The import flow is split into two steps executed by a single script:

1. Parse the GEDCOM file `gene.ged`
2. Generate an intermediate JSON file in `data/gedcom.json`
3. Upsert people and families into MongoDB
4. Resolve GEDCOM family references (`FAMS`, `FAMC`) into MongoDB document references

The import script automatically reads `.env.local` and `.env`, so if `MONGODB_URI` is set there you can run:

```bash
npm run import:ged
```

You can also pass a custom GEDCOM file path:

```bash
node ./scripts/importGedcom.js ./path/to/file.ged
```

What the script does:
- Reads the GEDCOM records and extracts `INDI` and `FAM`
- Fails if it finds unsupported GEDCOM lines in `INDI` or `FAM` records
- Validates relationship consistency between `INDI.FAMS` / `INDI.FAMC` and `FAM.HUSB` / `FAM.WIFE` / `FAM.CHIL`
- Writes a parsed JSON snapshot to `data/gedcom.json`
- Imports `INDI` records into the `Person` collection
- Imports `FAM` records into the `Family` collection
- Rewrites family links on each person using MongoDB object references

Validation rules:
- Every `FAMS` reference must point to an existing family and that family must list the person as `HUSB` or `WIFE`
- Every `FAMC` reference must point to an existing family and that family must list the person in `CHIL`
- Every `HUSB`, `WIFE`, and `CHIL` reference in a family must point to an existing individual
- Family references must be bidirectionally consistent; otherwise the import aborts

Expected output:
- A log line for the generated JSON file
- MongoDB connection logs
- A final summary like `Imported 705 persons and 226 families.`

If validation fails, the script exits with code `1` and prints the first inconsistencies or unrecognized lines it found.

If `MONGODB_URI` is not configured, the script still generates `data/gedcom.json` and skips the database import.

Notes
- API endpoint: `POST /api/graphql`
- The project contains a simple `Person` model and GraphQL queries/mutations to list and create persons.
- Google authentication is handled with Auth.js for Next.js (`next-auth`) and persists signed-in users in MongoDB.
- Genealogical data is private: unauthenticated users are redirected to sign-in pages and GraphQL genealogy queries require an authenticated session.
- The `addPerson` GraphQL mutation now requires an authenticated session.
