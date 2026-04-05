import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';

const buttonStyle = {
  border: '1px solid #d7c6b2',
  background: '#fffaf2',
  color: '#5b4938',
  borderRadius: 999,
  padding: '6px 10px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 13
};

export default function AuthStatus() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div style={{ fontSize: 13, color: '#7b6a59' }}>Checking session...</div>;
  }

  if (!session?.user) {
    return (
      <Link href="/auth/signin" style={{ ...buttonStyle, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
        Sign in with Google
      </Link>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      {session.user.image ? (
        <img src={session.user.image} alt={session.user.name || session.user.email || 'User avatar'} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1px solid #d7c6b2' }} />
      ) : null}
      <div style={{ fontSize: 13, color: '#7b6a59' }}>
        Signed in as {session.user.name || session.user.email}
      </div>
      <button type="button" onClick={() => signOut()} style={buttonStyle}>
        Sign out
      </button>
    </div>
  );
}