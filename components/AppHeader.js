import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import packageJson from '../package.json';

const shellStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 1000,
  backdropFilter: 'blur(12px)',
  background: 'rgba(251, 248, 241, 0.92)',
  borderBottom: '1px solid rgba(170, 145, 118, 0.28)'
};

const innerStyle = {
  maxWidth: 1100,
  margin: '0 auto',
  padding: '12px 24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16
};

const buttonLikeStyle = {
  border: '1px solid #d7c6b2',
  background: '#fffaf2',
  color: '#5b4938',
  borderRadius: 999,
  padding: '6px 10px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 13,
  textDecoration: 'none'
};

function UserMenu() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div style={{ fontSize: 13, color: '#7b6a59' }}>Checking session...</div>;
  }

  if (!session?.user) {
    return (
      <Link href="/auth/signin" style={{ ...buttonLikeStyle, display: 'inline-flex', alignItems: 'center' }}>
        Sign in
      </Link>
    );
  }

  const displayName = session.user.name || session.user.email || 'User';

  return (
    <details style={{ position: 'relative' }}>
      <summary
        style={{
          listStyle: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
          padding: '6px 10px',
          borderRadius: 999,
          border: '1px solid #d7c6b2',
          background: '#fffaf2',
          color: '#5b4938'
        }}
      >
        {session.user.image ? (
          <img src={session.user.image} alt={displayName} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1px solid #d7c6b2' }} />
        ) : null}
        <span style={{ fontSize: 13 }}>{displayName}</span>
      </summary>
      <div
        style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          minWidth: 220,
          padding: 12,
          borderRadius: 16,
          border: '1px solid #e2d5c3',
          background: '#fffaf2',
          boxShadow: '0 12px 30px rgba(78, 53, 32, 0.14)'
        }}
      >
        <div style={{ fontSize: 13, color: '#7b6a59', marginBottom: 4 }}>{session.user.email}</div>
        <div style={{ fontSize: 13, color: '#7b6a59', marginBottom: 12 }}>Role: {session.user.role || 'pending'}</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {session.user.role === 'admin' ? (
            <Link href="/admin/users" style={buttonLikeStyle}>
              Manage users
            </Link>
          ) : null}
          {/* All authenticated users can manage their own keys */}
          <Link href="/apikeys" style={buttonLikeStyle}>
            Manage API keys
          </Link>
          {/* Admin/editor global page removed per request */}
          <button type="button" onClick={() => signOut()} style={buttonLikeStyle}>
            Sign out
          </button>
        </div>
      </div>
    </details>
  );
}

export default function AppHeader() {
  return (
    <header style={shellStyle}>
      <div style={innerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <Link href="/" style={{ color: '#2f2419', textDecoration: 'none', fontSize: 24, fontWeight: 700, letterSpacing: '0.02em' }}>
            gene
          </Link>
          <Link
            href="https://github.com/paolini/gene"
            target="_blank"
            rel="noreferrer"
            style={{
              color: '#fbf8f1',
              background: 'rgba(47, 36, 25, 0.88)',
              padding: '6px 10px',
              borderRadius: 999,
              textDecoration: 'none',
              fontSize: 12,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              letterSpacing: '0.04em'
            }}
          >
            v{packageJson.version}
          </Link>
        </div>
        <UserMenu />
      </div>
    </header>
  );
}