import { createYoga, createSchema } from 'graphql-yoga';
import { getServerSession } from 'next-auth/next';
import { typeDefs, resolvers } from '../../graphql/schema';
import { authOptions } from '../../lib/auth';
import { connect } from '../../lib/mongodb';
import { setApiRequestLogContext, withApiRequestLogging } from '../../lib/apiRequestLogger';

let yoga: any;

async function getYoga() {
  if (!yoga) {
    await connect();
    yoga = createYoga({
      schema: createSchema({ typeDefs, resolvers }),
      graphqlEndpoint: '/api/graphql',
      context: async ({ req, res }: any) => {
        const session = (await getServerSession(req, res, authOptions as any)) as any;

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

async function handler(req: any, res: any) {
  const yogaHandler = await getYoga();
  return yogaHandler(req, res);
}

export default withApiRequestLogging(handler, { routeType: 'graphql' });
