#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { connect } = require('../lib/mongodb');
const Person = require('../models/Person');
const Family = require('../models/Family');

function failOnUnknownLines(unknownLines) {
  if (unknownLines.length === 0) {
    return;
  }

  const preview = unknownLines
    .slice(0, 20)
    .map((entry) => `- ${entry.recordType} ${entry.gedId || ''}: ${entry.line}`.trim())
    .join('\n');

  const suffix = unknownLines.length > 20
    ? `\n... and ${unknownLines.length - 20} more unrecognized lines`
    : '';

  throw new Error(`GEDCOM import aborted: found ${unknownLines.length} unrecognized lines.\n${preview}${suffix}`);
}

function failOnRelationshipErrors(relationshipErrors) {
  if (relationshipErrors.length === 0) {
    return;
  }

  const preview = relationshipErrors
    .slice(0, 20)
    .map((entry) => `- ${entry}`)
    .join('\n');

  const suffix = relationshipErrors.length > 20
    ? `\n... and ${relationshipErrors.length - 20} more relationship errors`
    : '';

  throw new Error(`GEDCOM import aborted: found ${relationshipErrors.length} relationship inconsistencies.\n${preview}${suffix}`);
}

function validateRelationships(individuals, families) {
  const errors = [];

  for (const [indiId, individual] of Object.entries(individuals)) {
    for (const famId of individual.fams || []) {
      const family = families[famId];
      if (!family) {
        errors.push(`INDI ${indiId} references missing FAMS ${famId}`);
        continue;
      }
      const isSpouse = family.husband === indiId || family.wife === indiId;
      if (!isSpouse) {
        errors.push(`INDI ${indiId} references FAMS ${famId}, but family does not list that person as HUSB or WIFE`);
      }
    }

    for (const famId of individual.famc || []) {
      const family = families[famId];
      if (!family) {
        errors.push(`INDI ${indiId} references missing FAMC ${famId}`);
        continue;
      }
      if (!family.children.includes(indiId)) {
        errors.push(`INDI ${indiId} references FAMC ${famId}, but family does not list that person in CHIL`);
      }
    }
  }

  for (const [famId, family] of Object.entries(families)) {
    if (family.husband) {
      const husband = individuals[family.husband];
      if (!husband) {
        errors.push(`FAM ${famId} references missing HUSB ${family.husband}`);
      } else if (!(husband.fams || []).includes(famId)) {
        errors.push(`FAM ${famId} lists HUSB ${family.husband}, but that individual does not reference the family in FAMS`);
      }
    }

    if (family.wife) {
      const wife = individuals[family.wife];
      if (!wife) {
        errors.push(`FAM ${famId} references missing WIFE ${family.wife}`);
      } else if (!(wife.fams || []).includes(famId)) {
        errors.push(`FAM ${famId} lists WIFE ${family.wife}, but that individual does not reference the family in FAMS`);
      }
    }

    for (const childId of family.children) {
      const child = individuals[childId];
      if (!child) {
        errors.push(`FAM ${famId} references missing CHIL ${childId}`);
      } else if (!(child.famc || []).includes(famId)) {
        errors.push(`FAM ${famId} lists CHIL ${childId}, but that individual does not reference the family in FAMC`);
      }
    }
  }

  failOnRelationshipErrors(errors);
}

function parseGedcom(content) {
  const lines = content.split(/\r?\n/);
  const records = [];
  let cur = null;
  for (const raw of lines) {
    const line = raw.replace(/\r?\n/, '');
    if (line.startsWith('0 ')) {
      if (cur) records.push(cur);
      cur = { lines: [line] };
    } else {
      if (cur) cur.lines.push(line);
    }
  }
  if (cur) records.push(cur);

  throw new Error("stop here")

  const individuals = {};
  const families = {};
  const unknownLines = [];

  for (const r of records) {
    const first = r.lines[0];
    const indiMatch = first.match(/^0\s+(@[^\s@]+@)\s+INDI/);
    const famMatch = first.match(/^0\s+(@[^\s@]+@)\s+FAM/);
    const headMatch = first.match(/^0\s+HEAD/);
    const trlrMatch = first.match(/^0\s+TRLR/);
    if (indiMatch) {
      const gedId = indiMatch[1];
      const out = {
        gedId,
        name: null,
        givenName: null,
        surname: null,
        sex: null,
        events: {},
        media: [],
        occupations: [],
        titles: [],
        associations: [],
        fams: [],
        famc: [],
        raw: r.lines
      };
      let curEvent = null;
      let curAssociation = null;
      let curMediaObject = null;
      for (const l of r.lines.slice(1)) {
        const m = l.match(/^\d+\s+([^\s]+)(?:\s+(.*))?$/);
        if (!m) {
          unknownLines.push({ recordType: 'INDI', gedId, line: l });
          continue;
        }
        const levelMatch = l.match(/^(\d+)\s+/);
        const level = levelMatch ? Number(levelMatch[1]) : null;
        const tag = m[1];
        const data = m[2] || '';
        if (tag === 'NAME') {
          out.name = data.trim();
          curAssociation = null;
          curMediaObject = null;
        } else if (tag === 'GIVN') {
          out.givenName = data.trim();
          curAssociation = null;
          curMediaObject = null;
        } else if (tag === 'SURN') {
          out.surname = data.trim();
          curAssociation = null;
          curMediaObject = null;
        } else if (tag === 'SEX') {
          out.sex = data.trim();
          curAssociation = null;
          curMediaObject = null;
        } else if (tag === 'FAMS') {
          out.fams.push(data.trim());
          curAssociation = null;
          curMediaObject = null;
        } else if (tag === 'FAMC') {
          out.famc.push(data.trim());
          curAssociation = null;
          curMediaObject = null;
        } else if (tag === 'BIRT' || tag === 'DEAT' || tag === 'MARR' || tag === 'BURI' || tag === 'BAPM') {
          curEvent = tag;
          out.events[curEvent] = out.events[curEvent] || {};
          curAssociation = null;
          curMediaObject = null;
        } else if (/^DATE$/.test(tag) && curEvent) {
          out.events[curEvent].date = data.trim();
        } else if (/^PLAC$/.test(tag) && curEvent) {
          out.events[curEvent].place = data.trim();
        } else if (tag === 'OCCU') {
          out.occupations.push(data.trim());
          curAssociation = null;
          curMediaObject = null;
        } else if (tag === 'TITL') {
          if (curMediaObject && level && level > 1) {
            curMediaObject.title = data.trim();
          } else {
            out.titles.push(data.trim());
          }
          curAssociation = null;
        } else if (tag === 'ASSO') {
          curAssociation = { target: data.trim(), type: null, relationship: null };
          out.associations.push(curAssociation);
          curEvent = null;
          curMediaObject = null;
        } else if (tag === 'TYPE' && curAssociation) {
          curAssociation.type = data.trim();
        } else if (tag === 'RELA' && curAssociation) {
          curAssociation.relationship = data.trim();
        } else if (tag === 'OBJE') {
          curEvent = null;
          curAssociation = null;
          curMediaObject = {
            file: null,
            format: null,
            title: null,
            isPrimary: false,
            type: null
          };
          out.media.push(curMediaObject);
        } else if (curMediaObject && tag === 'FILE') {
          curMediaObject.file = data.trim();
        } else if (curMediaObject && tag === 'FORM') {
          curMediaObject.format = data.trim();
        } else if (curMediaObject && tag === '_TYPE') {
          curMediaObject.type = data.trim();
        } else if (curMediaObject && tag === '_PRIM') {
          curMediaObject.isPrimary = data.trim().toUpperCase() === 'Y';
        } else if (tag === 'NOTE' || tag === 'CONT' || tag === 'CONC' || tag === 'NPFX' || tag === 'NSFX') {
          // accepted but currently ignored
        } else {
          unknownLines.push({ recordType: 'INDI', gedId, line: l });
        }
      }
      individuals[gedId] = out;
    } else if (famMatch) {
      const gedId = famMatch[1];
      const out = { gedId, husband: null, wife: null, children: [], events: {}, notes: [], raw: r.lines };
      let curEvent = null;
      for (const l of r.lines.slice(1)) {
        const m = l.match(/^\d+\s+([^\s]+)(?:\s+(.*))?$/);
        if (!m) {
          unknownLines.push({ recordType: 'FAM', gedId, line: l });
          continue;
        }
        const tag = m[1];
        const data = m[2] || '';
        if (tag === 'HUSB') out.husband = data.trim();
        else if (tag === 'WIFE') out.wife = data.trim();
        else if (tag === 'CHIL') out.children.push(data.trim());
        else if (tag === 'MARR' || tag === 'DIV') { curEvent = tag; out.events[curEvent] = out.events[curEvent] || {}; }
        else if (tag === 'DATE' && curEvent) out.events[curEvent].date = data.trim();
        else if (tag === 'PLAC' && curEvent) out.events[curEvent].place = data.trim();
        else if (tag === 'NOTE') out.notes.push(data.trim());
        else if (tag === 'CONT' || tag === 'CONC') {
          // accepted but currently ignored
        } else {
          unknownLines.push({ recordType: 'FAM', gedId, line: l });
        }
      }
      families[gedId] = out;
    } else if (headMatch || trlrMatch) {
      // GEDCOM metadata/header records are accepted but ignored by the importer.
      continue;
    } else {
      unknownLines.push({ recordType: 'TOP', gedId: '', line: first });
    }
  }

  failOnUnknownLines(unknownLines);
  validateRelationships(individuals, families);

  return { individuals, families };
}

async function run({ dry, json, fileArg, wipe }) {
  console.log(`[import] Starting GEDCOM import with file: ${fileArg}, options: ${JSON.stringify({ dry, json, wipe })}`);
  try {
    if (!fs.existsSync(fileArg)) {
      const msg = `\x1b[31m[ERRORE] GEDCOM file non trovato: ${fileArg}\x1b[0m\n\x1b[33mAssicurati che il file sia nel percorso corretto o specifica il path completo.\x1b[0m`;
      console.error(msg);
      throw new Error(msg);
    } else {
      console.log(`[import] GEDCOM file trovato: ${fileArg}`);
    }
    const content = fs.readFileSync(fileArg, 'utf8');
    console.log(`[import] Lettura file GEDCOM completata (${fileArg}).`);
    const parsed = parseGedcom(content);
    console.log(`[import] Parsing GEDCOM completato: trovate ${Object.keys(parsed.individuals).length} persone e ${Object.keys(parsed.families).length} famiglie.`);

    if (json) {
      console.warn('Outputting JSON to stdout.');
      console.log(JSON.stringify(parsed, null, 2));
      return;
    }

    if (dry) {
      console.warn('Dry run: skipping DB import. No changes will be written to the database.');
      return;
    }

    // Validazione relazioni e linee sconosciute già eseguita in parseGedcom
    console.log('[import] Validazione GEDCOM completata.');
    // Try to connect to MongoDB and import
    const conn = await connect();
    if (!conn) {
      console.warn('No MongoDB connection configured (MONGODB_URI). Skipping DB import.');
      return;
    }

    if (wipe) {
      console.log('Cancellazione di tutte le persone e famiglie dal database...');
      await Person.deleteMany({});
      await Family.deleteMany({});
      console.log('Database pulito.');
    }

    const gedToPersonId = {};
    console.log(`[import] Inizio importazione di ${Object.keys(parsed.individuals).length} persone...`);
    for (const gedId of Object.keys(parsed.individuals)) {
      const i = parsed.individuals[gedId];
      const doc = await Person.findOneAndUpdate({ gedId }, {
        gedId,
        name: i.name,
        sex: i.sex,
        birthDate: i.events && i.events.BIRT && i.events.BIRT.date ? i.events.BIRT.date : undefined,
        deathDate: i.events && i.events.DEAT && i.events.DEAT.date ? i.events.DEAT.date : undefined,
        events: i.events || {},
        media: (i.media || []).filter((entry) => entry.file),
        fams: [],
        famc: [],
        raw: i.raw
      }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
      gedToPersonId[gedId] = doc._id;
      if ((Object.keys(gedToPersonId).length % 100) === 0) {
        console.log(`[import] Persone importate finora: ${Object.keys(gedToPersonId).length}`);
      }
    }
    console.log(`[import] Importazione persone completata: ${Object.keys(gedToPersonId).length}`);

    const gedToFamilyId = {};
    console.log(`[import] Inizio importazione di ${Object.keys(parsed.families).length} famiglie...`);
    for (const gedId of Object.keys(parsed.families)) {
      const f = parsed.families[gedId];
      const husbandId = f.husband ? gedToPersonId[f.husband] || null : null;
      const wifeId = f.wife ? gedToPersonId[f.wife] || null : null;
      const childIds = f.children.map(g => gedToPersonId[g]).filter(Boolean);
      const famDoc = await Family.findOneAndUpdate({ gedId }, {
        gedId,
        husband: husbandId,
        wife: wifeId,
        children: childIds,
        events: f.events || {},
        raw: f.raw
      }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
      gedToFamilyId[gedId] = famDoc._id;
      if ((Object.keys(gedToFamilyId).length % 50) === 0) {
        console.log(`[import] Famiglie importate finora: ${Object.keys(gedToFamilyId).length}`);
      }
    }
    console.log(`[import] Importazione famiglie completata: ${Object.keys(gedToFamilyId).length}`);

    for (const gedId of Object.keys(parsed.individuals)) {
      const i = parsed.individuals[gedId];
      const personId = gedToPersonId[gedId];
      const fams = (i.fams || []).map(g => gedToFamilyId[g]).filter(Boolean);
      const famc = (i.famc || []).map(g => gedToFamilyId[g]).filter(Boolean);
      await Person.findByIdAndUpdate(personId, { fams, famc });
    }

    console.log('Imported', Object.keys(parsed.individuals).length, 'persons and', Object.keys(parsed.families).length, 'families.');
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  }
}

const args = process.argv.slice(2);
const json = args.includes('--json');
const dry = json || args.includes('--dry') || args.includes('--dry-run');
const fileArgs = args.filter(arg => !arg.startsWith('-'))

if (fileArgs.length > 1) {
  console.error('Multiple file arguments provided. Please provide only one GEDCOM file to import.');
  process.exit(1);
}

const fileArg = fileArgs[0] || path.join(__dirname, '..', 'gene.ged');

run({ dry, json, fileArg }).catch(err => { console.error(err); process.exit(1); });
