import Link from 'next/link';
import { getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Person from '../../components/Person';

const personQuery = `
  query Person($id: ID!) {
    person(id: $id) {
      id
      name
      gedId
      birthDate
      deathDate
      sex
      events {
        BIRT { date place }
        DEAT { date place }
        MARR { date place }
        DIV { date place }
        BURI { date place }
        BAPM { date place }
      }
      media {
        file
        format
        title
        isPrimary
        type
      }
      fams {
        id
        gedId
        husband { id name }
        wife { id name }
        children { id name }
      }
      famc {
        id
        gedId
        husband { id name }
        wife { id name }
        children { id name }
      }
    }
  }
`;

export default function PersonPage() {
  const router = useRouter();
  const { id } = router.query;
  const [person, setPerson] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      return;
    }

    let cancelled = false;

    async function fetchPerson() {
      setLoading(true);
      setError('');
      const res = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: personQuery, variables: { id } })
      });
      const json = await res.json();

      if (cancelled) {
        return;
      }

      if (json.errors?.length) {
        setError(json.errors[0].message || 'caricamento persona fallito');
        setPerson(null);
      } else {
        setPerson(json.data?.person || null);
      }

      setLoading(false);
    }

    fetchPerson();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div style={{ padding: 24, fontFamily: 'Georgia, serif', background: 'linear-gradient(180deg, #f5efe2 0%, #fbf8f1 100%)', minHeight: '100vh', color: '#2f2419' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ marginBottom: 20 }}>
          <Link href="/" style={{ color: '#7a4b2a', textDecoration: 'none' }}>
            ← Torna alla home
          </Link>
        </div>
        {loading ? <div>carica persona...</div> : null}
        {!loading && error ? <div style={{ color: '#8b2d2d' }}>{error}</div> : null}
        {!loading && !error && !person ? <div>Persona non trovata.</div> : null}

        {person ? <Person person={person} /> : null}
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

  return { props: {} };
}
