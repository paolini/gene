#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { connect } = require('../lib/mongodb');
const Person = require('../models/Person');
const Family = require('../models/Family');

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

  const individuals = {};
  const families = {};

  for (const r of records) {
    const first = r.lines[0];
    const indiMatch = first.match(/^0\s+(@[^\s@]+@)\s+INDI/);
    const famMatch = first.match(/^0\s+(@[^\s@]+@)\s+FAM/);
    if (indiMatch) {
      const gedId = indiMatch[1];
      const out = { gedId, name: null, sex: null, events: {}, fams: [], famc: [], raw: r.lines };
      let curEvent = null;
      for (const l of r.lines.slice(1)) {
        const m = l.match(/^\d+\s+([^\s]+)(?:\s+(.*))?$/);
        if (!m) continue;
        const tag = m[1];
        const data = m[2] || '';
        if (tag === 'NAME') out.name = data.trim();
        else if (tag === 'SEX') out.sex = data.trim();
        else if (tag === 'FAMS') out.fams.push(data.trim());
        else if (tag === 'FAMC') out.famc.push(data.trim());
        else if (tag === 'BIRT' || tag === 'DEAT' || tag === 'MARR') {
          curEvent = tag;
          out.events[curEvent] = out.events[curEvent] || {};
        } else if (/^DATE$/.test(tag) && curEvent) {
          out.events[curEvent].date = data.trim();
        } else if (/^PLAC$/.test(tag) && curEvent) {
          out.events[curEvent].place = data.trim();
        } else if (tag === 'DATE' && r.lines[0].includes('INDI')) {
          // fallback
        }
      }
      individuals[gedId] = out;
    } else if (famMatch) {
      const gedId = famMatch[1];
      const out = { gedId, husband: null, wife: null, children: [], events: {}, raw: r.lines };
      let curEvent = null;
      for (const l of r.lines.slice(1)) {
        const m = l.match(/^\d+\s+([^\s]+)(?:\s+(.*))?$/);
        if (!m) continue;
        const tag = m[1];
        const data = m[2] || '';
        if (tag === 'HUSB') out.husband = data.trim();
        else if (tag === 'WIFE') out.wife = data.trim();
        else if (tag === 'CHIL') out.children.push(data.trim());
        else if (tag === 'MARR') { curEvent = 'MARR'; out.events[curEvent] = out.events[curEvent] || {}; }
        else if (tag === 'DATE' && curEvent) out.events[curEvent].date = data.trim();
        else if (tag === 'PLAC' && curEvent) out.events[curEvent].place = data.trim();
      }
      families[gedId] = out;
    }
  }

  return { individuals, families };
}

async function run() {
  try {
    const fileArg = process.argv[2] || path.join(__dirname, '..', 'gene.ged');
    if (!fs.existsSync(fileArg)) {
      console.error('GEDCOM file not found:', fileArg);
      process.exit(1);
    }
    const content = fs.readFileSync(fileArg, 'utf8');
    const parsed = parseGedcom(content);

    // write JSON export
    const outDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
    const outPath = path.join(outDir, 'gedcom.json');
    fs.writeFileSync(outPath, JSON.stringify(parsed, null, 2), 'utf8');
    console.log('Wrote parsed GEDCOM to', outPath);

    // Try to connect to MongoDB and import
    const conn = await connect();
    if (!conn) {
      console.warn('No MongoDB connection configured (MONGODB_URI). Skipping DB import.');
      return;
    }

    const gedToPersonId = {};
    for (const gedId of Object.keys(parsed.individuals)) {
      const i = parsed.individuals[gedId];
      const doc = await Person.findOneAndUpdate({ gedId }, {
        gedId,
        name: i.name,
        sex: i.sex,
        birthDate: i.events && i.events.BIRT && i.events.BIRT.date ? i.events.BIRT.date : undefined,
        deathDate: i.events && i.events.DEAT && i.events.DEAT.date ? i.events.DEAT.date : undefined,
        fams: [],
        famc: [],
        raw: i.raw
      }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
      gedToPersonId[gedId] = doc._id;
    }

    const gedToFamilyId = {};
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
    }

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

run().catch(err => { console.error(err); process.exit(1); });
