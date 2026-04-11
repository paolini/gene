import { GraphQLError } from 'graphql';
import Person from '../models/Person';
import Family from '../models/Family';
import User from '../models/User';
import UserInvitation from '../models/UserInvitation';

function createInvitationToken() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

function requireAuthenticatedUser(context: any) {
  if (!context?.session?.user?.email) {
    throw new Error('Authentication required');
  }
}

function requireAuthorizedRole(context: any, allowedRoles: string[]) {
  requireAuthenticatedUser(context);

  const role = context?.session?.user?.role;
  if (!role) {
    throw new Error('Role required');
  }

  if (!allowedRoles.includes(role)) {
    throw new Error('Insufficient permissions');
  }
}

function normalizeRole(role: any) {
  if (role == null || role === '') {
    return null;
  }

  if (['guest', 'editor', 'admin'].includes(role)) {
    return role;
  }

  throw new Error('Invalid role');
}

function resolveId(document: any) {
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

function createClientSafeError(message: string, code: string) {
  return new GraphQLError(message, {
    extensions: { code }
  });
}

async function redeemInvitationForUser(token: string, sessionUserEmail: string) {
  const invitation = await UserInvitation.findOne({ token }).lean();

  if (!invitation) {
    throw createClientSafeError('Invitation not found', 'INVITATION_NOT_FOUND');
  }

  if (!invitation.isActive) {
    throw createClientSafeError('Invitation is disabled', 'INVITATION_DISABLED');
  }

  if (!invitation.isReusable && invitation.usedAt) {
    throw createClientSafeError('Invitation already used', 'INVITATION_ALREADY_USED');
  }

  const user = await User.findOne({ email: sessionUserEmail });
  if (!user) {
    throw createClientSafeError('Authenticated user not found', 'USER_NOT_FOUND');
  }

  if (user.role) {
    throw createClientSafeError('This account already has a role', 'USER_ALREADY_HAS_ROLE');
  }

  user.role = invitation.role;
  await user.save();

  const usedAt = new Date();
  const update: any = {
    $set: {
      lastUsedBy: user._id,
      lastUsedAt: usedAt
    },
    $inc: {
      redemptionCount: 1
    }
  };

  if (!invitation.isReusable) {
    update.$set.usedBy = user._id;
    update.$set.usedAt = usedAt;
    update.$set.isActive = false;
    update.$set.disabledAt = usedAt;
  }

  const updatedInvitation = await UserInvitation.findByIdAndUpdate(invitation._id, update, { new: true })
    .populate('createdBy')
    .populate('usedBy')
    .populate('lastUsedBy')
    .lean();

  return updatedInvitation;
}

export const typeDefs = /* GraphQL */ `
  type EventDetails {
    date: String
    place: String
  }

  type Events {
    BIRT: EventDetails
    DEAT: EventDetails
    MARR: EventDetails
    DIV: EventDetails
    BURI: EventDetails
    BAPM: EventDetails
  }

  type PersonMedia {
    file: String
    format: String
    title: String
    isPrimary: Boolean
    type: String
  }

  type Person {
    id: ID!
    gedId: String
    name: String
    sex: String
    birthDate: String
    deathDate: String
    media: [PersonMedia!]!
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

  type UserInvitation {
    id: ID!
    token: String!
    role: String!
    isReusable: Boolean!
    isActive: Boolean!
    createdBy: AuthUser
    usedBy: AuthUser
    usedAt: String
    lastUsedBy: AuthUser
    lastUsedAt: String
    redemptionCount: Int!
    disabledAt: String
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
    userInvitations: [UserInvitation!]!
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
    createUserInvitation(role: String!, isReusable: Boolean): UserInvitation!
    setUserInvitationActive(invitationId: ID!, isActive: Boolean!): UserInvitation!
    deleteUserInvitation(invitationId: ID!): ID!
    redeemUserInvitation(token: String!): UserInvitation!
  }
`;

export const resolvers: any = {
  Person: {
    id: (parent: any) => resolveId(parent),
    fams: async (parent: any) => {
      if (!parent.fams || parent.fams.length === 0) {
        return [];
      }
      return Family.find({ _id: { $in: parent.fams } }).lean();
    },
    famc: async (parent: any) => {
      if (!parent.famc || parent.famc.length === 0) {
        return [];
      }
      return Family.find({ _id: { $in: parent.famc } }).lean();
    }
  },
  Family: {
    id: (parent: any) => resolveId(parent),
    husband: async (parent: any) => parent.husband ? Person.findById(parent.husband).lean() : null,
    wife: async (parent: any) => parent.wife ? Person.findById(parent.wife).lean() : null,
    children: async (parent: any) => {
      if (!parent.children || parent.children.length === 0) {
        return [];
      }
      return Person.find({ _id: { $in: parent.children } }).lean();
    }
  },
  AuthUser: {
    id: (parent: any) => resolveId(parent)
  },
  UserInvitation: {
    id: (parent: any) => resolveId(parent)
  },
  Query: {
    persons: async (_: any, __: any, context: any) => {
      requireAuthorizedRole(context, ['guest', 'editor', 'admin']);
      return Person.find().sort({ createdAt: -1 }).lean();
    },
    person: async (_: any, { id }: any, context: any) => {
      requireAuthorizedRole(context, ['guest', 'editor', 'admin']);
      return Person.findById(id).lean();
    },
    families: async (_: any, __: any, context: any) => {
      requireAuthorizedRole(context, ['guest', 'editor', 'admin']);
      return Family.find().sort({ createdAt: -1 }).lean();
    },
    family: async (_: any, { id }: any, context: any) => {
      requireAuthorizedRole(context, ['guest', 'editor', 'admin']);
      return Family.findById(id).lean();
    },
    currentUser: async (_: any, __: any, context: any) => {
      if (!context?.session?.user?.email) {
        return null;
      }

      return User.findOne({ email: context.session.user.email }).lean();
    },
    users: async (_: any, __: any, context: any) => {
      requireAuthorizedRole(context, ['admin']);
      return User.find().sort({ createdAt: 1, email: 1 }).lean();
    },
    userInvitations: async (_: any, __: any, context: any) => {
      requireAuthorizedRole(context, ['admin']);

      return UserInvitation.find()
        .sort({ createdAt: -1 })
        .populate('createdBy')
        .populate('usedBy')
        .populate('lastUsedBy')
        .lean();
    }
  },
  Mutation: {
    addPerson: async (_: any, { input }: any, context: any) => {
      requireAuthorizedRole(context, ['editor', 'admin']);

      const p = await Person.create(input as any);
      return p.toObject();
    },
    setUserRole: async (_: any, { userId, role }: any, context: any) => {
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
    },
    createUserInvitation: async (_: any, { role, isReusable }: any, context: any) => {
      requireAuthorizedRole(context, ['admin']);

      const normalizedRole = normalizeRole(role);
      if (!normalizedRole) {
        throw new Error('Invalid role');
      }

      const invitation = await UserInvitation.create({
        token: createInvitationToken(),
        role: normalizedRole,
        isReusable: Boolean(isReusable),
        createdBy: context.session.user.id
      });

      return UserInvitation.findById(invitation._id)
        .populate('createdBy')
        .populate('usedBy')
        .populate('lastUsedBy')
        .lean();
    },
    setUserInvitationActive: async (_: any, { invitationId, isActive }: any, context: any) => {
      requireAuthorizedRole(context, ['admin']);

      const invitation = await UserInvitation.findByIdAndUpdate(
        invitationId,
        {
          $set: {
            isActive,
            disabledAt: isActive ? null : new Date()
          }
        },
        { new: true, runValidators: true }
      )
        .populate('createdBy')
        .populate('usedBy')
        .populate('lastUsedBy')
        .lean();

      if (!invitation) {
        throw new Error('Invitation not found');
      }

      return invitation;
    },
    deleteUserInvitation: async (_: any, { invitationId }: any, context: any) => {
      requireAuthorizedRole(context, ['admin']);

      const invitation = await UserInvitation.findByIdAndDelete(invitationId).lean();

      if (!invitation) {
        throw new Error('Invitation not found');
      }

      return resolveId(invitation);
    },
    redeemUserInvitation: async (_: any, { token }: any, context: any) => {
      requireAuthenticatedUser(context);
      return redeemInvitationForUser(token, context.session.user.email);
    }
  }
};
