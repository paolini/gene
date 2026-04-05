import Link from 'next/link';
import { getSession, signOut } from 'next-auth/react';

const pageStyle = {
  minHeight: '100vh',
  padding: 24,
  fontFamily: 'Georgia, serif',
  background: 'linear-gradient(180deg, #f5efe2 0%, #fbf8f1 100%)',
  color: '#2f2419'
};

const cardStyle = {
  maxWidth: 560,
  margin: '80px auto 0',
  background: '#fffaf2',
  border: '1px solid #e2d5c3',
  borderRadius: 24,
  padding: 28,
  boxShadow: '0 16px 40px rgba(78, 53, 32, 0.08)'
};

const buttonStyle = {
  border: '1px solid #d7c6b2',
  background: '#fffaf2',
  color: '#5b4938',
  borderRadius: 999,
  padding: '8px 12px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 14
};

export default function PendingAccessPage({ user }) {
  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <Link href="/auth/signin" style={{ color: '#7a4b2a', textDecoration: 'none' }}>
          ← Back to sign in
        </Link>

        <div style={cardStyle}>
          <div style={{ fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8a735d', marginBottom: 10 }}>
            Access Restricted
          </div>
          <h1 style={{ margin: '0 0 10px', fontSize: 34 }}>Role required</h1>
          <p style={{ margin: '0 0 18px', color: '#6d5a48', lineHeight: 1.6 }}>
            Your Google account is authenticated, but it does not have an explicit role yet. An administrator must assign `guest`, `editor`, or `admin` before you can access genealogical data.
          </p>
          <div style={{ fontSize: 14, color: '#7b6a59', marginBottom: 18 }}>
            Signed in as {user?.name || user?.email || 'unknown user'}
          </div>
          <button type="button" onClick={() => signOut({ callbackUrl: '/auth/signin' })} style={buttonStyle}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);

  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false
      }
    };
  }

  if (session.user?.role) {
    return {
      redirect: {
        destination: '/',
        permanent: false
      }
    };
  }

  return {
    props: {
      user: session.user || null
    }
  };
}