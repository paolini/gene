import { useEffect, useState } from 'react';

const query = `query { persons { id name gedId birthDate deathDate sex } }`;

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
    <div style={{ padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <h1>Gene Tree — Persons</h1>
      <form onSubmit={addPerson} style={{ marginBottom: 12 }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" />
        <button type="submit">Add</button>
      </form>
      <ul>
        {persons.map(p => (
          <li key={p.id}>{p.name} {p.birthDate ? `(${p.birthDate})` : ''}</li>
        ))}
      </ul>
    </div>
  );
}
