import { useEffect, useState } from 'react';

const query = `
  query {
    persons {
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

function familyLabel(family, personId) {
  if (!family) {
    return 'Unknown family';
  }

  const spouse = [family.husband, family.wife].find((candidate) => candidate && candidate.id !== personId);
  if (spouse) {
    return spouse.name || family.gedId;
  }

  return family.gedId || 'Unnamed family';
}

export default function Home() {
  const [persons, setPersons] = useState([]);
  const [name, setName] = useState('');

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

  async function addPerson(e) {
    e.preventDefault();
    const mutation = `mutation Add($input: PersonInput!) { addPerson(input: $input) { id name } }`;
    const res = await fetch('/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: mutation, variables: { input: { name } } })
    });
    await res.json();
    setName('');
    fetchPersons();
  }

  return (
    <div style={{ padding: 24, fontFamily: 'Georgia, serif', background: 'linear-gradient(180deg, #f5efe2 0%, #fbf8f1 100%)', minHeight: '100vh', color: '#2f2419' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ marginBottom: 8 }}>Gene Tree</h1>
        <p style={{ marginTop: 0, marginBottom: 24, color: '#6a5948' }}>
          Persons, spouse families, and origin families loaded from GEDCOM.
        </p>
        <form onSubmit={addPerson} style={{ marginBottom: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Name"
            style={{ padding: '10px 12px', minWidth: 240, border: '1px solid #c9b79f', borderRadius: 8, background: '#fffdf8' }}
          />
          <button type="submit" style={{ padding: '10px 14px', border: 0, borderRadius: 8, background: '#7a4b2a', color: '#fffaf2', cursor: 'pointer' }}>
            Add person
          </button>
        </form>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {persons.map((p) => (
            <article key={p.id} style={{ background: '#fffaf2', border: '1px solid #e2d5c3', borderRadius: 16, padding: 16, boxShadow: '0 8px 24px rgba(78, 53, 32, 0.08)' }}>
              <header style={{ marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 22 }}>{p.name || 'Unnamed person'}</h2>
                <div style={{ fontSize: 13, color: '#7b6a59', marginTop: 4 }}>{p.gedId} {p.sex ? `• ${p.sex}` : ''}</div>
                <div style={{ fontSize: 14, color: '#5b4938', marginTop: 6 }}>
                  {p.birthDate ? `Born: ${p.birthDate}` : 'Birth date unknown'}
                  {p.deathDate ? ` • Died: ${p.deathDate}` : ''}
                </div>
              </header>

              <section style={{ marginBottom: 12 }}>
                <strong style={{ display: 'block', marginBottom: 6 }}>Spouse families</strong>
                {p.fams && p.fams.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {p.fams.map((family) => (
                      <li key={family.id} style={{ marginBottom: 6 }}>
                        <div>{familyLabel(family, p.id)}</div>
                        <div style={{ fontSize: 13, color: '#7b6a59' }}>
                          {family.children && family.children.length > 0
                            ? `Children: ${family.children.map((child) => child.name || child.id).join(', ')}`
                            : 'No children listed'}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ color: '#7b6a59' }}>No spouse families</div>
                )}
              </section>

              <section>
                <strong style={{ display: 'block', marginBottom: 6 }}>Family of origin</strong>
                {p.famc && p.famc.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {p.famc.map((family) => (
                      <li key={family.id} style={{ marginBottom: 6 }}>
                        <div>
                          Parents: {[family.husband?.name, family.wife?.name].filter(Boolean).join(' and ') || family.gedId}
                        </div>
                        <div style={{ fontSize: 13, color: '#7b6a59' }}>
                          Siblings: {(family.children || [])
                            .filter((child) => child.id !== p.id)
                            .map((child) => child.name || child.id)
                            .join(', ') || 'No siblings listed'}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ color: '#7b6a59' }}>No origin family</div>
                )}
              </section>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
