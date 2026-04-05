#!/usr/bin/env node
const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { connect } = require('../lib/mongodb');
const UserInvitation = require('../models/UserInvitation');

function createInvitationToken() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

function normalizeRole(role) {
  if (['guest', 'editor', 'admin'].includes(role)) {
    return role;
  }

  throw new Error('Role must be one of: guest, editor, admin');
}

function parseArgs(argv) {
  const args = argv.slice(2);
  let role = 'guest';
  let baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  let isReusable = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--role') {
      role = args[index + 1] || role;
      index += 1;
      continue;
    }

    if (arg === '--base-url') {
      baseUrl = args[index + 1] || baseUrl;
      index += 1;
      continue;
    }

    if (arg === '--reusable') {
      isReusable = true;
      continue;
    }

    if (!arg.startsWith('--')) {
      role = arg;
    }
  }

  return {
    role: normalizeRole(role),
    baseUrl: baseUrl.replace(/\/$/, ''),
    isReusable
  };
}

async function main() {
  const { role, baseUrl, isReusable } = parseArgs(process.argv);

  const connection = await connect();
  if (!connection) {
    throw new Error('MONGODB_URI is required to create invitation links');
  }

  const invitation = await UserInvitation.create({
    token: createInvitationToken(),
    role,
    isReusable,
    createdBy: null
  });

  const inviteUrl = `${baseUrl}/invite/${invitation.token}`;

  console.log(`Created ${isReusable ? 'reusable' : 'one-time'} ${role} invitation`);
  console.log(`Token: ${invitation.token}`);
  console.log(`URL: ${inviteUrl}`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });