import Link from 'next/link';
import { getProviders, getSession, signIn } from 'next-auth/react';
import { googleAuthConfigured } from '../../lib/auth';

const pageStyle = {
  minHeight: '100vh',
  padding: 24,
  fontFamily: 'Georgia, serif',
  background: 'linear-gradient(180deg, #f5efe2 0%, #fbf8f1 100%)',
  color: '#2f2419'
};

const cardStyle = {
  maxWidth: 520,
  margin: '80px auto 0',
  background: '#fffaf2',
  border: '1px solid #e2d5c3',
  borderRadius: 24,
  padding: 28,
  boxShadow: '0 16px 40px rgba(78, 53, 32, 0.08)'
};

const providerButtonStyle = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  border: '1px solid #d7c6b2',
  background: 'linear-gradient(180deg, #fffdfa 0%, #fff7ed 100%)',
  color: '#4a3b2d',
  borderRadius: 14,
  padding: '12px 14px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 16,
  boxShadow: '0 8px 18px rgba(78, 53, 32, 0.08)'
};

const googleBadgeStyle = {
  width: 26,
  height: 26,
  borderRadius: '50%',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'conic-gradient(from 210deg, #ea4335 0deg, #ea4335 90deg, #fbbc05 90deg, #fbbc05 180deg, #34a853 180deg, #34a853 270deg, #4285f4 270deg, #4285f4 360deg)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
  boxShadow: 'inset 0 0 0 2px rgba(255, 255, 255, 0.85)'
};

export default function SignInPage({ providers, callbackUrl, googleAuthConfigured: isConfigured, error }) {
  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <Link href="/" style={{ color: '#7a4b2a', textDecoration: 'none' }}>
          ← Torna alla home
        </Link>

        <div style={cardStyle}>
          <div style={{ fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8a735d', marginBottom: 10 }}>
            Account Access
          </div>
          <h1 style={{ margin: '0 0 10px', fontSize: 36 }}>Sign in</h1>
          <p style={{ margin: '0 0 24px', color: '#6d5a48', lineHeight: 1.5 }}>
            Use your Google account to unlock authenticated actions like editing or adding people.
          </p>

          {error === 'InvalidInvite' ? (
            <div style={{ borderRadius: 16, background: '#fff1e8', color: '#7a4b2a', padding: 16, border: '1px solid #ebd1bf', lineHeight: 1.5, marginBottom: 16 }}>
              This invitation link is invalid or has already been used.
            </div>
          ) : null}

          {isConfigured ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {Object.values(providers || {}).map((provider) => (
                <button key={provider.name} type="button" onClick={() => signIn(provider.id, { callbackUrl: callbackUrl || '/' })} style={providerButtonStyle}>
                  <span style={googleBadgeStyle}>G</span>
                  Sign in with {provider.name}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ borderRadius: 16, background: '#fff1e8', color: '#7a4b2a', padding: 16, border: '1px solid #ebd1bf', lineHeight: 1.5 }}>
              Google sign-in is not configured yet. Add `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` to `.env.local`, then restart the dev server.
            </div>
          )}

          <div style={{ marginTop: 22, fontSize: 13, color: '#8a735d', lineHeight: 1.5 }}>
            After signing in, your basic profile is stored in MongoDB and your session is used to protect write operations.
          </div>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  const callbackUrl = typeof context.query.callbackUrl === 'string' ? context.query.callbackUrl : '/';
  const error = typeof context.query.error === 'string' ? context.query.error : '';

  if (session) {
    return {
      redirect: {
        destination: callbackUrl,
        permanent: false
      }
    };
  }

  const providers = await getProviders();

  return {
    props: {
      providers: providers || null,
      callbackUrl,
      googleAuthConfigured,
      error
    }
  };
}