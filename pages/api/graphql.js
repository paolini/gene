const { createYoga, createSchema } = require('graphql-yoga');
const { getServerSession } = require('next-auth/next');
const { typeDefs, resolvers } = require('../../graphql/schema');
const { authOptions } = require('../../lib/auth');
const { connect } = require('../../lib/mongodb');

let yoga;

async function getYoga() {
  if (!yoga) {
    await connect();
    yoga = createYoga({
      schema: createSchema({ typeDefs, resolvers }),
      graphqlEndpoint: '/api/graphql',
      context: async ({ req, res }) => ({
        session: await getServerSession(req, res, authOptions)
      }),
      fetchAPI: { Response }
    });
  }
  return yoga;
}

export default async function handler(req, res) {
  const yogaHandler = await getYoga();
  return yogaHandler(req, res);
}
