const { createYoga, createSchema } = require('graphql-yoga');
const { typeDefs, resolvers } = require('../../graphql/schema');
const { connect } = require('../../lib/mongodb');

let yoga;

async function getYoga() {
  if (!yoga) {
    await connect();
    yoga = createYoga({
      schema: createSchema({ typeDefs, resolvers }),
      graphqlEndpoint: '/api/graphql',
      fetchAPI: { Response }
    });
  }
  return yoga;
}

export default async function handler(req, res) {
  const yogaHandler = await getYoga();
  return yogaHandler(req, res);
}
