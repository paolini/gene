import Link from 'next/link';
import { useRouter } from 'next/router';
import { getSession, signIn, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

const redeemInvitationMutation = `
  mutation RedeemUserInvitation($token: String!) {
    redeemUserInvitation(token: $token) {
      id
      role
      usedAt
    }
  }
`;

const pageStyle = {
  minHeight: '100vh',
  padding: 24,
  fontFamily: 'Georgia, serif',
  background: 'linear-gradient(180deg, #f5efe2 0%, #fbf8f1 100%)',
  color: '#2f2419'
};

const cardStyle = {
  maxWidth: 620,
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
  padding: '10px 14px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 14,
  textDecoration: 'none'
};

export default function InviteRedeemPage({ token }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [state, setState] = useState({ phase: 'idle', message: '' });

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }

    let cancelled = false;

    async function redeem() {
      setState({ phase: 'loading', message: 'Applying invitation...' });

      let json;

      try {
        const response = await fetch('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: redeemInvitationMutation,
            variables: { token }
          })
        });

        json = await response.json();
      } catch {
        if (!cancelled) {
          setState({
            phase: 'error',
            message: 'Unable to contact the server while redeeming the invitation.'
          });
        }
        return;
      }

      if (cancelled) {
        return;
      }

      if (json.errors?.length) {
        setState({
          phase: 'error',
          message: json.errors[0].message || 'Unable to redeem invitation'
        });
        return;
      }

      setState({
        phase: 'success',
        message: `Role ${json.data?.redeemUserInvitation?.role || 'assigned'} assigned successfully. Redirecting...`
      });

      window.setTimeout(() => {
        router.replace('/');
      }, 800);
    }

    redeem();

    return () => {
      cancelled = true;
    };
  }, [router, status, token]);

  if (status === 'loading') {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>Checking session...</div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div style={pageStyle}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <Link href="/" style={{ color: '#7a4b2a', textDecoration: 'none' }}>
            ← Back
          </Link>

          <div style={cardStyle}>
            <div style={{ fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8a735d', marginBottom: 10 }}>
              Invitation
            </div>
            <h1 style={{ margin: '0 0 10px', fontSize: 34 }}>Sign in to accept the invitation</h1>
            <p style={{ margin: '0 0 20px', color: '#6d5a48', lineHeight: 1.6 }}>
              This link will assign its configured role to the authenticated account that redeems it.
            </p>
            <button type="button" onClick={() => signIn('google', { callbackUrl: `/invite/${token}?invite=${encodeURIComponent(token)}` })} style={buttonStyle}>
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <Link href="/" style={{ color: '#7a4b2a', textDecoration: 'none' }}>
          ← Back to home
        </Link>

        <div style={cardStyle}>
          <div style={{ fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8a735d', marginBottom: 10 }}>
            Invitation
          </div>
          <h1 style={{ margin: '0 0 10px', fontSize: 34 }}>Redeem invitation</h1>
          <p style={{ margin: '0 0 20px', color: '#6d5a48', lineHeight: 1.6 }}>
            Signed in as {session.user.name || session.user.email || 'unknown user'}.
          </p>
          <div style={{ color: state.phase === 'error' ? '#8b2d2d' : '#5b4938', marginBottom: 20 }}>
            {state.message || 'Preparing invitation...'}
          </div>
          {state.phase === 'success' ? (
            <Link href="/" style={buttonStyle}>
              Continue to the app
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  const token = typeof context.params?.token === 'string' ? context.params.token : '';
  const session = await getSession(context);

  if (!token) {
    return {
      notFound: true
    };
  }

  if (!session) {
    return {
      props: {
        token
      }
    };
  }

  return {
    props: {
      token
    }
  };
}