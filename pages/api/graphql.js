const { createYoga, createSchema } = require('graphql-yoga');
const { getServerSession } = require('next-auth/next');
const { typeDefs, resolvers } = require('../../graphql/schema');
const { authOptions } = require('../../lib/auth');
const { connect } = require('../../lib/mongodb');
const { setApiRequestLogContext, withApiRequestLogging } = require('../../lib/apiRequestLogger');

let yoga;

async function getYoga() {
  if (!yoga) {
    await connect();
    yoga = createYoga({
      schema: createSchema({ typeDefs, resolvers }),
      graphqlEndpoint: '/api/graphql',
      context: async ({ req, res }) => {
        const session = await getServerSession(req, res, authOptions);

        setApiRequestLogContext(req, {
          userId: session?.user?.id || null,
          userEmail: session?.user?.email || null,
          userRole: session?.user?.role || null
        });

        return { session };
      },
      fetchAPI: { Response }
    });
  }
  return yoga;
}

async function handler(req, res) {
  const yogaHandler = await getYoga();
  return yogaHandler(req, res);
}

export default withApiRequestLogging(handler, { routeType: 'graphql' });
