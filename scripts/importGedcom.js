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
  const gedcom = linesToTree(content.split(/\r?\n/));
  console.log(`converted GEDCOM to tree structure with ${gedcom.children.length} top-level records`);

  console.log(`parsing GEDCOM tree into individuals and families...`);
  let trailing_found = false;
  const individuals = {};
  const families = {};
  for (const record of gedcom.children) {
    if (trailing_found) {
      throw new Error(`GEDCOM import aborted: found record after TRLR record with tag ${record.tag}`);
    }
    if (record.tag === 'HEAD') {
      console.log(`skipping HEAD record:`);
      console.log(treeToString(record));
    } else if (record.tag === 'TRLR') {
      trailing_found = true;
    } else if (record.tag.endsWith('INDI')) {
      const indi = parseIndividual(record);
      individuals[indi.gedId] = indi;
    } else if (record.tag.endsWith('FAM')) {
      const fam = parseFamily(record);
      families[fam.gedId] = fam;
    } else {
      throw new Error(`GEDCOM import aborted: found unexpected top-level record with tag ${record.tag}`);
    }
  }
  if (!trailing_found) {
    throw new Error(`GEDCOM import aborted: missing required TRLR record at end of file`);
  }
  return { individuals, families };

  function linesToTree(lines) {
    const gedcom = { tag: 'ROOT' };
    const stack = [gedcom];
    let line_number = 0;
    for (const line of content.split(/\r?\n/)) {
      line_number++;
      if (line.length > 255) {
        throw new Error(`GEDCOM import aborted: found line exceeding 255 characters: "${line.slice(0, 50)}..."`);
      }
      if (line.trim() === '') {
        continue;
      }
      const m = line.match(/^(\d+)\s+(.*)$/)
      if (!m) {
        throw new Error(`GEDCOM import aborted: found line with invalid format (missing level number) at line ${line_number}: "${line}"`);
      }
      const level = parseInt(m[1]);
      if (isNaN(level) || level < 0) {
        throw new Error(`GEDCOM import aborted: found line with invalid level number at line ${line_number}: "${line}"`);
      }
      const tag = m[2];
      if (stack.length <= level) {
        throw new Error(`GEDCOM import aborted: found line with level ${level} but no parent at line ${line_number}: "${line}"`);
      }
      const node = { tag, line_number };
      if (!stack[level].children) {
        stack[level].children = [];
      }
      stack[level].children.push(node);
      stack.splice(level+1);
      stack.push(node);
    }
    return gedcom;
  }

  function treeToString(node, indent = '') {
    let str = `${indent}${node.tag}\n`;
    if (node.children) {
      for (const child of node.children) {
        str += treeToString(child, indent + '  ');
      }
    }
    return str;
  }

  function parseTag(tag) {
    const m = tag.match(/^([^\s]+)\s*(.*)$/);
    if (!m) {      
      throw new Error(`GEDCOM import aborted: found tag with invalid format at line ${line_number}: "${tag}"`);
    }
    return [m[1], m[2].trim()];
  }

  function parseFamily(record) {
    const line_number = record.line_number;
    const famMatch = record.tag.match(/^(@[^\s@]+@)\s+FAM$/);
    if (!famMatch) {
      throw new Error(`GEDCOM import aborted: found FAM record with invalid format at line ${line_number}: "${record.tag}"`);
    }
    const fam = {
      gedId: famMatch[1],
      husband: null,
      wife: null,
      children: [],
      events: {},
      raw: JSON.stringify(record)
    };
    for (const child of record.children || []) {
      const [tag, data] = parseTag(child.tag);
      if (tag === 'HUSB') {
        fam.husband = data;
      } else if (tag === 'WIFE') {
        fam.wife = data;
      } else if (tag === 'CHIL') {
        fam.children.push(data);
      } else if (tag === 'MARR' || tag === 'DIV') {
        const event = parseEvent(tag, data, child.children || []);
        fam.events[tag] = event;
      } else {
        throw new Error(`GEDCOM import aborted: found line with unrecognized tag "${tag}" in family record at line ${line_number}: "${child.tag}"`);
      }
    }
    return fam;
  }

  function parseIndividual(record) {
    const line_number = record.line_number;
    const indiMatch = record.tag.match(/^(@[^\s@]+@)\s+INDI$/);
    if (!indiMatch) {
      throw new Error(`GEDCOM import aborted: found INDI record with invalid format at line ${line_number}: "${record.tag}"`);
    }
    const indi = {
        gedId: null,
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
        raw: JSON.stringify(record),
        notes: []
      };
    indi.gedId = indiMatch[1];
    for (const child of record.children || []) {
      const [tag, data] = parseTag(child.tag);
      function noChildrenExpected() {
        if (child.children && child.children.length > 0) {
          throw new Error(`GEDCOM import aborted: found unexpected child lines for tag ${tag} at line ${line_number}: "${child.tag}"`);
        }
      }
      if (tag === 'NAME') {
        noChildrenExpected();
        indi.name = data;
      } else if (tag === 'GIVN') {
        noChildrenExpected();
        indi.givenName = data;
      } else if (tag === 'SURN') {
        noChildrenExpected();
        indi.surname = data;
      } else if (tag === 'SEX') {
        noChildrenExpected();
        indi.sex = data;
      } else if (tag === 'FAMS') {
        noChildrenExpected();
        indi.fams.push(data);
      } else if (tag === 'FAMC') {
        noChildrenExpected();
        indi.famc.push(data);
      } else if (tag === 'BIRT' || tag === 'DEAT' || tag === 'MARR' || tag === 'BURI' || tag === 'BAPM') {
        const event = parseEvent(tag, data, child.children || []);
        indi.events[tag] = event;
      } else if (tag === 'OBJE') {
        indi.media.push(parseMedia(tag, data, child.children || []));
      } else if (tag === 'NOTE') {
        indi.notes.push(parseNote(tag, data, child.children || []));
      } else if (tag === 'OCCU') {
        noChildrenExpected();
        indi.occupations.push(data);
      } else if (tag === 'TITL') {
        indi.titles.push(parseTitle(tag, data, child.children || []));
      } else {
        throw new Error(`GEDCOM import aborted: found line with unrecognized tag "${tag}" at line ${line_number}: "${child.tag}"`);
      }
    }
    return indi;

    function parseTitle(tag, data, children) {
      const title = {
        title: data,
        date: null,
        note: null,
      }
      if (data === '') {
        throw new Error(`GEDCOM import aborted: found title with empty text at line ${line_number}: "${child.tag}"`);
      }
      for (const child of children) {
        const [childTag, childData] = parseTag(child.tag);
        if (childTag === 'DATE') {
          if (childData === '') {
            throw new Error(`GEDCOM import aborted: found title with empty DATE at line ${line_number}: "${child.tag}"`);
          }
          if (title.date) {
            throw new Error(`GEDCOM import aborted: found title with multiple DATE entries at line ${line_number}: "${child.tag}"`);
          }
          title.date = childData;
        } else if (childTag === 'NOTE') {
          if (childData === '') {
            throw new Error(`GEDCOM import aborted: found title with empty NOTE at line ${line_number}: "${child.tag}"`);
          }
          if (title.note) {
            throw new Error(`GEDCOM import aborted: found title with multiple NOTE entries at line ${line_number}: "${child.tag}"`);
          }
          title.note = childData;
        } else {
          throw new Error(`GEDCOM import aborted: found line with unrecognized tag "${childTag}" in title at line ${line_number}: "${child.tag}"`);
        }
      }
      return title;
    }

    function parseMedia(tag, data, children) {
      if (data !== '') {
        throw new Error(`GEDCOM import aborted: found unexpected data for media tag ${tag} at line ${line_number}: "${child.tag}"`);
      }
      const media = { file: null, format: null, title: null, isPrimary: false, type: null };
      for (const child of children) {
        const [childTag, childData] = parseTag(child.tag);
        if (childTag === 'FILE') {
          if (childData === '') {
            throw new Error(`GEDCOM import aborted: found media with empty FILE at line ${line_number}: "${child.tag}"`);
          }
          if (media.file) {
            throw new Error(`GEDCOM import aborted: found media with multiple FILE entries at line ${line_number}: "${child.tag}"`);
          }
          media.file = childData;
        } else if (childTag === 'FORM') {
          if (childData === '') {
            throw new Error(`GEDCOM import aborted: found media with empty FORM at line ${line_number}: "${child.tag}"`);
          }
          if (media.format) {
            throw new Error(`GEDCOM import aborted: found media with multiple FORM entries at line ${line_number}: "${child.tag}"`);
          }
          media.format = childData;
        } else if (childTag === '_TYPE') {
          if (childData === '') {
            throw new Error(`GEDCOM import aborted: found media with empty _TYPE at line ${line_number}: "${child.tag}"`);
          }
          if (media.type) {
            throw new Error(`GEDCOM import aborted: found media with multiple _TYPE entries at line ${line_number}: "${child.tag}"`);
          }
          media.type = childData;
        } else if (childTag === '_PRIM') {
          if (childData === '') {
            throw new Error(`GEDCOM import aborted: found media with empty _PRIM at line ${line_number}: "${child.tag}"`);
          }
          if (media.isPrimary) {
            throw new Error(`GEDCOM import aborted: found media with multiple _PRIM entries at line ${line_number}: "${child.tag}"`);
          }
          media.isPrimary = childData.toUpperCase() === 'Y';
        } else {
          throw new Error(`GEDCOM import aborted: found line with unrecognized tag "${childTag}" in media at line ${line_number}: "${child.tag}"`);
        }
      }
      return media;
    }

    function parseNote(tag, data, children) {
      let line = "";
      if (data === '') {
        throw new Error(`GEDCOM import aborted: found NOTE with empty text at line ${line_number}: "${child.tag}"`);
      }
      line += data;
      for (const child of children) {
        const [childTag, childData] = parseTag(child.tag);
        if (childTag === 'CONT') {
          if (childData === '') {
            throw new Error(`GEDCOM import aborted: found CONT with empty text at line ${line_number}: "${child.tag}"`);
          }
          line += '\n' + childData;
        } else if (childTag === 'CONC') {
          if (childData === '') {
            throw new Error(`GEDCOM import aborted: found CONC with empty text at line ${line_number}: "${child.tag}"`);
          }
          line += childData;
        } else {
          throw new Error(`GEDCOM import aborted: found line with unrecognized tag "${childTag}" in NOTE at line ${line_number}: "${child.tag}"`);
        }
      }
      return line;
    } 
  }

  function parseEvent(tag, data, children) {
    if (data !== '' && data !== 'Y') {
      throw new Error(`GEDCOM import aborted: found unexpected data for event tag ${tag} at line ${line_number}: "${child.tag}"`);
    }
    const event = { date: null, place: null };
    for (const child of children) {
      const [childTag, childData] = parseTag(child.tag);
      if (childTag === 'DATE') {
        if (childData === '') {
          throw new Error(`GEDCOM import aborted: found event with empty DATE at line ${line_number}: "${child.tag}"`);
        }
        if (event.date) {
          throw new Error(`GEDCOM import aborted: found event with multiple DATE entries at line ${line_number}: "${child.tag}"`);
        }
        event.date = childData;
      } else if (childTag === 'PLAC') {
        if (childData === '') {
          throw new Error(`GEDCOM import aborted: found event with empty PLAC at line ${line_number}: "${child.tag}"`);
        }
        if (event.place) {
          throw new Error(`GEDCOM import aborted: found event with multiple PLAC entries at line ${line_number}: "${child.tag}"`);
        }
        event.place = childData;
      } else {
        throw new Error(`GEDCOM import aborted: found line with unrecognized tag "${childTag}" in event ${tag} at line ${line_number}: "${child.tag}"`);
      }
    }
    return event;
  }
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

    validateRelationships(parsed.individuals, parsed.families);
    console.log('[import] Validazione GEDCOM completata.');

    console.log(`esempio:`);
    console.log(parsed.individuals['@I28@']);

    if (json) {
      console.warn('Outputting JSON to stdout.');
      console.log(JSON.stringify(parsed, null, 2));
      return;
    }

    if (dry) {
      console.warn('Dry run: skipping DB import. No changes will be written to the database.');
      return;
    }

    // Try to connect to MongoDB and import
    const conn = await connect();
    if (!conn) {
      console.warn('No MongoDB connection configured (MONGODB_URI). Skipping DB import.');
      return;
    }

    if (wipe) {
      if (dry) {
        throw new Error('Cannot use --wipe option in dry run mode. Please remove --dry to enable wiping the database before import.');
      }
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
        titles: i.titles || ['pippo'],
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
