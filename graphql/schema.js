const Person = require('../models/Person');

const typeDefs = /* GraphQL */ `
  type Person {
    id: ID!
    gedId: String
    name: String
    sex: String
    birthDate: String
    deathDate: String
    fams: [String]
    famc: [String]
  }

  type Query {
    persons: [Person]
    person(id: ID!): Person
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
  }
`;

const resolvers = {
  Query: {
    persons: async () => Person.find().sort({ createdAt: -1 }).lean(),
    person: async (_, { id }) => Person.findById(id).lean()
  },
  Mutation: {
    addPerson: async (_, { input }) => {
      const p = await Person.create(input);
      return p.toObject();
    }
  }
};

module.exports = { typeDefs, resolvers };
