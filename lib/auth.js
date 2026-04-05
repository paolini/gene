const GoogleProvider = require('next-auth/providers/google').default;
const { connect } = require('./mongodb');
const User = require('../models/User');

const googleClientId = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET;
const googleAuthConfigured = Boolean(googleClientId && googleClientSecret);

const authOptions = {
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: '/auth/signin'
  },
  session: {
    strategy: 'jwt'
  },
  providers: googleAuthConfigured
    ? [
        GoogleProvider({
          clientId: googleClientId,
          clientSecret: googleClientSecret
        })
      ]
    : [],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== 'google') {
        return false;
      }

      if (!profile?.email) {
        return false;
      }

      await connect();
      await User.findOneAndUpdate(
        { email: profile.email },
        {
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          emailVerified: Boolean(profile.email_verified),
          lastLoginAt: new Date()
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return true;
    },
    async jwt({ token, profile }) {
      if (!token?.email && !profile?.email) {
        return token;
      }

      await connect();
      const dbUser = await User.findOne({ email: token.email || profile.email }).lean();

      if (dbUser) {
        token.userId = dbUser._id.toString();
        token.role = dbUser.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId || null;
        session.user.role = token.role || null;
      }

      return session;
    }
  }
};

module.exports = { authOptions, googleAuthConfigured };