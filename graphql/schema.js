const Person = require('../models/Person');
const Family = require('../models/Family');
const User = require('../models/User');

function requireAuthenticatedUser(context) {
  if (!context?.session?.user?.email) {
    throw new Error('Authentication required');
  }
}

function requireAuthorizedRole(context, allowedRoles) {
  requireAuthenticatedUser(context);

  const role = context?.session?.user?.role;
  if (!role) {
    throw new Error('Role required');
  }

  if (!allowedRoles.includes(role)) {
    throw new Error('Insufficient permissions');
  }
}

function normalizeRole(role) {
  if (role == null || role === '') {
    return null;
  }

  if (['guest', 'editor', 'admin'].includes(role)) {
    return role;
  }

  throw new Error('Invalid role');
}

function resolveId(document) {
  if (!document) {
    return null;
  }

  if (document.id) {
    return document.id.toString();
  }

  if (document._id) {
    return document._id.toString();
  }

  return null;
}

const typeDefs = /* GraphQL */ `
  type EventDetails {
    date: String
    place: String
  }

  type Events {
    BIRT: EventDetails
    DEAT: EventDetails
    MARR: EventDetails
    BURI: EventDetails
    BAPM: EventDetails
  }

  type Person {
    id: ID!
    gedId: String
    name: String
    sex: String
    birthDate: String
    deathDate: String
    fams: [Family]
    famc: [Family]
  }

  type Family {
    id: ID!
    gedId: String
    husband: Person
    wife: Person
    children: [Person]
    events: Events
    notes: [String]
  }

  type AuthUser {
    id: ID!
    name: String
    email: String
    image: String
    role: String
    emailVerified: Boolean
    lastLoginAt: String
    createdAt: String
    updatedAt: String
  }

  type Query {
    persons: [Person]
    person(id: ID!): Person
    families: [Family]
    family(id: ID!): Family
    currentUser: AuthUser
    users: [AuthUser]
  }

  input PersonInput {
    gedId: String
    name: String
    sex: String
    birthDate: String
    deathDate: String
  }

  type Mutation {
    addPerson(input: PersonInput!): Person
    setUserRole(userId: ID!, role: String): AuthUser
  }
`;

const resolvers = {
  Person: {
    id: (parent) => resolveId(parent),
    fams: async (parent) => {
      if (!parent.fams || parent.fams.length === 0) {
        return [];
      }
      return Family.find({ _id: { $in: parent.fams } }).lean();
    },
    famc: async (parent) => {
      if (!parent.famc || parent.famc.length === 0) {
        return [];
      }
      return Family.find({ _id: { $in: parent.famc } }).lean();
    }
  },
  Family: {
    id: (parent) => resolveId(parent),
    husband: async (parent) => parent.husband ? Person.findById(parent.husband).lean() : null,
    wife: async (parent) => parent.wife ? Person.findById(parent.wife).lean() : null,
    children: async (parent) => {
      if (!parent.children || parent.children.length === 0) {
        return [];
      }
      return Person.find({ _id: { $in: parent.children } }).lean();
    }
  },
  AuthUser: {
    id: (parent) => resolveId(parent)
  },
  Query: {
    persons: async (_, __, context) => {
      requireAuthorizedRole(context, ['guest', 'editor', 'admin']);
      return Person.find().sort({ createdAt: -1 }).lean();
    },
    person: async (_, { id }, context) => {
      requireAuthorizedRole(context, ['guest', 'editor', 'admin']);
      return Person.findById(id).lean();
    },
    families: async (_, __, context) => {
      requireAuthorizedRole(context, ['guest', 'editor', 'admin']);
      return Family.find().sort({ createdAt: -1 }).lean();
    },
    family: async (_, { id }, context) => {
      requireAuthorizedRole(context, ['guest', 'editor', 'admin']);
      return Family.findById(id).lean();
    },
    currentUser: async (_, __, context) => {
      if (!context?.session?.user?.email) {
        return null;
      }

      return User.findOne({ email: context.session.user.email }).lean();
    },
    users: async (_, __, context) => {
      requireAuthorizedRole(context, ['admin']);
      return User.find().sort({ createdAt: 1, email: 1 }).lean();
    }
  },
  Mutation: {
    addPerson: async (_, { input }, context) => {
      requireAuthorizedRole(context, ['editor', 'admin']);

      const p = await Person.create(input);
      return p.toObject();
    },
    setUserRole: async (_, { userId, role }, context) => {
      requireAuthorizedRole(context, ['admin']);

      const normalizedRole = normalizeRole(role);
      const user = await User.findByIdAndUpdate(
        userId,
        { $set: { role: normalizedRole } },
        { new: true, runValidators: true }
      ).lean();

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    }
  }
};

module.exports = { typeDefs, resolvers };
