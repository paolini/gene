const NextAuth = require('next-auth').default;
const { authOptions } = require('../../../lib/auth');
const { withApiRequestLogging } = require('../../../lib/apiRequestLogger');

const nextAuthHandler = NextAuth(authOptions);

export default withApiRequestLogging(nextAuthHandler, { routeType: 'auth' });