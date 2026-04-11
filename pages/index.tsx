import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';
import Person from '../components/Person';
import { formatPersonNameText } from '../lib/personName';

type PersonSummary = {
  id: string;
  name?: any;
  gedId?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
};

const query = `
  query {
    persons {
      id
      name
      gedId
      birthDate
      deathDate
      sex
      media { file isPrimary title }
      fams { id gedId husband { id name } wife { id name } children { id name } }
      famc { id gedId husband { id name } wife { id name } children { id name } }
    }
  }
`;

export default function Home(): JSX.Element {
  const [persons, setPersons] = useState<PersonSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');

  async function fetchPersons() {
    const res = await fetch('/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const j = await res.json();
    setPersons(j.data.persons || []);
  }

  useEffect(() => { fetchPersons(); }, []);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredPersons = normalizedSearch
    ? persons.filter((person) => {
        const haystack = [formatPersonNameText(person.name, ''), person.gedId, person.birthDate, person.deathDate]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalizedSearch);
      })
    : [];

  return (
    <div style={{ padding: 24, fontFamily: 'Georgia, serif', background: 'linear-gradient(180deg, #f5efe2 0%, #fbf8f1 100%)', minHeight: '100vh', color: '#2f2419' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 24, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="cerca per nome o data..."
            style={{ padding: '10px 12px', minWidth: 240, border: '1px solid #c9b79f', borderRadius: 8, background: '#fffdf8' }}
          />
          <div style={{ fontSize: 14, color: '#6a5948' }}>
            visualizza {filteredPersons.length} di {persons.length}
          </div>
        </div>
        {!normalizedSearch ? (
          <div style={{ marginBottom: 20, padding: 16, borderRadius: 12, background: '#fffaf2', border: '1px solid #e2d5c3', color: '#6a5948' }}>
            Inserisci un termine di ricerca per visualizzare le persone corrispondenti.
          </div>
        ) : null}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, alignItems: 'start' }}>
          {filteredPersons.map((p) => (
            <Person key={p.id} person={p} />
          ))}
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context as any);

  if (!session) {
    return {
      redirect: {
        destination: `/auth/signin?callbackUrl=${encodeURIComponent('/')}`,
        permanent: false
      }
    };
  }

  if (!((session as any).user?.role)) {
    return {
      redirect: {
        destination: '/auth/pending',
        permanent: false
      }
    };
  }

  return { props: {} };
};
