import Link from 'next/link';
import { getSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import AuthStatus from '../../components/AuthStatus';

const usersQuery = `
  query AdminUsers {
    users {
      id
      name
      email
      image
      role
      emailVerified
      lastLoginAt
      createdAt
      updatedAt
    }
  }
`;

const setUserRoleMutation = `
  mutation SetUserRole($userId: ID!, $role: String) {
    setUserRole(userId: $userId, role: $role) {
      id
      role
      updatedAt
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

const panelStyle = {
  background: '#fffaf2',
  border: '1px solid #e2d5c3',
  borderRadius: 20,
  padding: 24,
  boxShadow: '0 8px 24px rgba(78, 53, 32, 0.08)'
};

const selectStyle = {
  padding: '8px 10px',
  border: '1px solid #c9b79f',
  borderRadius: 8,
  background: '#fffdf8',
  color: '#2f2419',
  fontFamily: 'inherit'
};

const badgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: 999,
  padding: '4px 10px',
  background: '#f1e3cf',
  color: '#6f5238',
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.06em'
};

function formatDate(value) {
  if (!value) {
    return 'Never';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function roleValue(role) {
  return role || '';
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState('');

  async function fetchUsers() {
    setLoading(true);
    setError('');

    const response = await fetch('/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: usersQuery })
    });
    const json = await response.json();

    if (json.errors?.length) {
      setUsers([]);
      setError(json.errors[0].message || 'Unable to load users');
    } else {
      setUsers(json.data?.users || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function handleRoleChange(userId, nextRole) {
    setSavingUserId(userId);
    setError('');

    const response = await fetch('/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: setUserRoleMutation,
        variables: {
          userId,
          role: nextRole || null
        }
      })
    });
    const json = await response.json();

    if (json.errors?.length) {
      setError(json.errors[0].message || 'Unable to update role');
      setSavingUserId('');
      return;
    }

    setUsers((currentUsers) => currentUsers.map((user) => (
      user.id === userId
        ? {
            ...user,
            role: json.data?.setUserRole?.role || null,
            updatedAt: json.data?.setUserRole?.updatedAt || user.updatedAt
          }
        : user
    )));
    setSavingUserId('');
  }

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 20 }}>
          <Link href="/" style={{ color: '#7a4b2a', textDecoration: 'none' }}>
            ← Back to persons
          </Link>
        </div>

        <div style={{ marginBottom: 16 }}>
          <AuthStatus />
        </div>

        <section style={panelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8a735d', marginBottom: 8 }}>
                Administration
              </div>
              <h1 style={{ margin: '0 0 8px', fontSize: 34 }}>User management</h1>
              <p style={{ margin: 0, color: '#6d5a48', lineHeight: 1.6, maxWidth: 720 }}>
                Assign or revoke explicit roles for authenticated users. Accounts without a role remain blocked on the pending access page.
              </p>
            </div>
            <div style={badgeStyle}>{users.length} users</div>
          </div>

          {loading ? <div>Loading users...</div> : null}
          {!loading && error ? <div style={{ color: '#8b2d2d', marginBottom: 16 }}>{error}</div> : null}

          {!loading ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {users.map((user) => {
                const isSaving = savingUserId === user.id;

                return (
                  <article key={user.id} style={{ border: '1px solid #e2d5c3', borderRadius: 16, padding: 16, background: '#fffdf8' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(180px, 220px)', gap: 16, alignItems: 'center' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                          {user.image ? (
                            <img src={user.image} alt={user.name || user.email || 'User avatar'} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '1px solid #d7c6b2' }} />
                          ) : null}
                          <div>
                            <div style={{ fontSize: 20, fontWeight: 600, overflowWrap: 'anywhere' }}>{user.name || 'Unnamed user'}</div>
                            <div style={{ color: '#6d5a48', overflowWrap: 'anywhere' }}>{user.email}</div>
                          </div>
                          <span style={badgeStyle}>{user.role || 'pending'}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 13, color: '#7b6a59' }}>
                          <span>Email verified: {user.emailVerified ? 'yes' : 'no'}</span>
                          <span>Last login: {formatDate(user.lastLoginAt)}</span>
                          <span>Created: {formatDate(user.createdAt)}</span>
                        </div>
                      </div>

                      <label style={{ display: 'grid', gap: 8, justifyItems: 'start' }}>
                        <span style={{ fontSize: 13, color: '#7b6a59' }}>Role</span>
                        <select
                          value={roleValue(user.role)}
                          onChange={(event) => handleRoleChange(user.id, event.target.value)}
                          disabled={isSaving}
                          style={selectStyle}
                        >
                          <option value="">Pending</option>
                          <option value="guest">Guest</option>
                          <option value="editor">Editor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </label>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);

  if (!session) {
    return {
      redirect: {
        destination: `/auth/signin?callbackUrl=${encodeURIComponent(context.resolvedUrl || '/')}`,
        permanent: false
      }
    };
  }

  if (!session.user?.role) {
    return {
      redirect: {
        destination: '/auth/pending',
        permanent: false
      }
    };
  }

  if (session.user.role !== 'admin') {
    return {
      redirect: {
        destination: '/',
        permanent: false
      }
    };
  }

  return { props: {} };
}