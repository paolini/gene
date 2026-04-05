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

If you want to import a specific GEDCOM file, run:

```bash
npm run import:ged -- ./path/to/file.ged
```

You can also pass a custom GEDCOM file path:

```bash
node ./scripts/importGedcom.js ./path/to/file.ged
```

If the app is running in Docker Compose, copy the GEDCOM file into the app container and run the import there:

```bash
docker cp ./gene.ged <container-name>:/tmp/gene.ged
docker compose exec app npm run import:ged -- /tmp/gene.ged
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
- Authentication alone is not sufficient: users must also have an explicit role (`guest`, `editor`, or `admin`) to access genealogy data.
- Admin users can generate one-time or reusable invitation links that assign a predefined role when redeemed, and can disable them later from the admin UI.
- If no admin exists anymore, you can bootstrap a new invitation from the command line with `npm run invite:user -- admin`.
- The `addPerson` GraphQL mutation now requires an authenticated session.

Database migrations

The repository uses `migrate-mongo` for explicit MongoDB migrations. The configuration lives in `migrate-mongo-config.js` and reads `.env.local` and `.env` to resolve `MONGODB_URI`.

Create a new migration:

```bash
npm run migrate:create -- add-invitation-flags
```

Apply pending migrations:

```bash
npm run migrate:up
```

Rollback the last migration:

```bash
npm run migrate:down
```

Show migration status:

```bash
npm run migrate:status
```

Migration files are stored in the `migrations/` directory and tracked through the `migrations_changelog` collection in MongoDB.

The repository already includes an initial migration to normalize legacy `UserInvitation` documents with the newer invitation fields.

Invitation bootstrap from CLI

The invite creation script reads `.env.local` and `.env`, connects to MongoDB, and prints an invitation URL.

This is the recovery path when the `users` collection is empty, the previous admin was deleted, or no application admin can access the UI anymore.

Create an admin invitation using the configured `NEXTAUTH_URL`:

```bash
npm run invite:user -- admin
```

Create an invitation for a different role:

```bash
npm run invite:user -- guest
npm run invite:user -- editor
```

Create a reusable invitation link:

```bash
npm run invite:user -- admin --reusable
```

Override the base URL printed in the invitation link:

```bash
npm run invite:user -- --role admin --base-url https://gene.example.com
```

If you are running in Docker Compose, you can create the invitation inside the app container:

```bash
docker compose exec app npm run invite:user -- admin
docker compose exec app npm run invite:user -- admin --reusable
```

Typical recovery flow:

1. Generate an admin invitation from the shell.
2. Open the printed URL in the browser.
3. Sign in with Google using the account that should become admin.
4. The role is assigned when the invitation page is redeemed.

Invitation behavior:

1. One-time links stop working after the first successful redemption.
2. Reusable links can be redeemed any number of times by different pending accounts.
3. Any invitation link can be disabled or re-enabled from the Manage users page.

Docker deployment

Build the image:

```bash
docker build -t gene-tree .
```

Run the container:

```bash
docker run --rm -p 3000:3000 \
	-e MONGODB_URI=mongodb://host.docker.internal:27017/gene \
	-e AUTH_SECRET=replace-with-a-long-random-string \
	-e AUTH_GOOGLE_ID=your-google-oauth-client-id \
	-e AUTH_GOOGLE_SECRET=your-google-oauth-client-secret \
	gene-tree
```

Apply pending migrations in the running container before using the app after a deploy that changes database structure or data shape:

```bash
docker exec <container-name> npm run migrate:up
```

If you use Docker Compose, the equivalent command is:

```bash
docker compose exec app npm run migrate:up
```

If deploying behind a public URL, also set `NEXTAUTH_URL` to the external base URL of the app.
