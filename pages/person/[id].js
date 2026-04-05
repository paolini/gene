import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const personQuery = `
  query Person($id: ID!) {
    person(id: $id) {
      id
      name
      gedId
      birthDate
      deathDate
      sex
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

function PersonLink({ person }) {
  if (!person?.id) {
    return person?.name || 'Unknown person';
  }

  return (
    <Link href={`/person/${person.id}`} style={{ color: '#7a4b2a', textDecoration: 'none' }}>
      {person.name || person.id}
    </Link>
  );
}

function PersonList({ people }) {
  if (!people || people.length === 0) {
    return 'None listed';
  }

  return people.map((person, index) => (
    <span key={person.id || `${person.name}-${index}`}>
      {index > 0 ? ', ' : ''}
      <PersonLink person={person} />
    </span>
  ));
}

function ParentsLine({ family }) {
  const parents = [family?.husband, family?.wife].filter(Boolean);
  if (parents.length === 0) {
    return family?.gedId || 'Unknown parents';
  }

  return parents.map((parent, index) => (
    <span key={parent.id || `${parent.name}-${index}`}>
      {index > 0 ? ' and ' : ''}
      <PersonLink person={parent} />
    </span>
  ));
}

function familyLabel(family, personId) {
  if (!family) {
    return 'Unknown family';
  }

  const spouse = [family.husband, family.wife].find((candidate) => candidate && candidate.id !== personId);

  return spouse?.name || family.gedId || 'Unnamed family';
}

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
        setError(json.errors[0].message || 'Failed to load person');
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
            ← Back to all persons
          </Link>
        </div>

        {loading ? <div>Loading person...</div> : null}
        {!loading && error ? <div style={{ color: '#8b2d2d' }}>{error}</div> : null}
        {!loading && !error && !person ? <div>Person not found.</div> : null}

        {person ? (
          <article style={{ background: '#fffaf2', border: '1px solid #e2d5c3', borderRadius: 20, padding: 24, boxShadow: '0 8px 24px rgba(78, 53, 32, 0.08)' }}>
            <header style={{ marginBottom: 20 }}>
              <h1 style={{ margin: 0, fontSize: 34 }}>{person.name || 'Unnamed person'}</h1>
              <div style={{ fontSize: 14, color: '#7b6a59', marginTop: 6 }}>{person.gedId} {person.sex ? `• ${person.sex}` : ''}</div>
              <div style={{ fontSize: 16, color: '#5b4938', marginTop: 10 }}>
                {person.birthDate ? `Born: ${person.birthDate}` : 'Birth date unknown'}
                {person.deathDate ? ` • Died: ${person.deathDate}` : ''}
              </div>
              <div style={{ marginTop: 12 }}>
                <Link href={`/tree/person/${person.id}`} style={{ color: '#365f48', textDecoration: 'none', fontSize: 14 }}>
                  Open interactive person tree
                </Link>
              </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
              <section style={{ background: '#fcf6ec', borderRadius: 14, padding: 16, border: '1px solid #eadcc9' }}>
                <strong style={{ display: 'block', marginBottom: 10 }}>Spouse families</strong>
                {person.fams?.length ? (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {person.fams.map((family) => (
                      <li key={family.id} style={{ marginBottom: 10 }}>
                        <div>
                          Spouse: <PersonLink person={[family.husband, family.wife].find((candidate) => candidate && candidate.id !== person.id)} />
                        </div>
                        <div style={{ fontSize: 13, color: '#7b6a59', marginTop: 4 }}>
                          {family.children?.length
                            ? <span>Children: <PersonList people={family.children} /></span>
                            : 'No children listed'}
                        </div>
                        <div style={{ fontSize: 12, color: '#8c7b69', marginTop: 4 }}>{family.gedId || familyLabel(family, person.id)}</div>
                        <div style={{ marginTop: 6 }}>
                          <Link href={`/tree/person/${person.id}`} style={{ color: '#365f48', textDecoration: 'none', fontSize: 13 }}>
                            Open person tree
                          </Link>
                        </div>
                        <div style={{ marginTop: 4 }}>
                          <Link href={`/family/${family.id}`} style={{ color: '#7a4b2a', textDecoration: 'none', fontSize: 12 }}>
                            Open family-centered tree
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ color: '#7b6a59' }}>No spouse families</div>
                )}
              </section>

              <section style={{ background: '#fcf6ec', borderRadius: 14, padding: 16, border: '1px solid #eadcc9' }}>
                <strong style={{ display: 'block', marginBottom: 10 }}>Family of origin</strong>
                {person.famc?.length ? (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {person.famc.map((family) => (
                      <li key={family.id} style={{ marginBottom: 10 }}>
                        <div>
                          Parents: <ParentsLine family={family} />
                        </div>
                        <div style={{ fontSize: 13, color: '#7b6a59', marginTop: 4 }}>
                          Siblings: <PersonList people={(family.children || []).filter((child) => child.id !== person.id)} />
                        </div>
                        <div style={{ fontSize: 12, color: '#8c7b69', marginTop: 4 }}>{family.gedId}</div>
                        <div style={{ marginTop: 6 }}>
                          <Link href={`/tree/person/${person.id}`} style={{ color: '#365f48', textDecoration: 'none', fontSize: 13 }}>
                            Open person tree
                          </Link>
                        </div>
                        <div style={{ marginTop: 4 }}>
                          <Link href={`/family/${family.id}`} style={{ color: '#7a4b2a', textDecoration: 'none', fontSize: 12 }}>
                            Open family-centered tree
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ color: '#7b6a59' }}>No origin family</div>
                )}
              </section>
            </div>
          </article>
        ) : null}
      </div>
    </div>
  );
}
