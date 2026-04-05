const NextAuth = require('next-auth').default;
const { authOptions } = require('../../../lib/auth');

export default NextAuth(authOptions);