import { useEffect, useState } from 'react';

const personTreeQuery = `
  query PersonTree($id: ID!) {
    person(id: $id) {
      id
      name
      gedId
      sex
      birthDate
      deathDate
      media { file isPrimary title }
      famc {
        id
        gedId
        husband { id name gedId sex birthDate deathDate media { file isPrimary title } famc { id gedId } fams { id gedId husband { id name } wife { id name } children { id name gedId } } }
        wife { id name gedId sex birthDate deathDate media { file isPrimary title } famc { id gedId } fams { id gedId husband { id name } wife { id name } children { id name gedId } } }
        children { id name gedId media { file isPrimary title } }
      }
      fams {
        id
        gedId
        husband { id name media { file isPrimary title } }
        wife { id name media { file isPrimary title } }
        children { id name gedId sex birthDate deathDate media { file isPrimary title } famc { id gedId } fams { id gedId } }
      }
    }
  }
`;

export function usePersonCache() {
    const [personCache, setPersonCache] = useState({});

    async function fetchPerson(personId) {
        const res = await fetch('/api/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: personTreeQuery, variables: { id: personId } })
        });
        const json = await res.json();
        if (json.errors?.length) {
            throw new Error(json.errors[0].message || 'Failed to load person');
        }
        return json.data?.person || null;
    }

    async function getPerson(personId) {
        if (personCache[personId]) return personCache[personId];
        const person = await fetchPerson(personId);
        setPersonCache((current) => current[person.id] ? current : {
            ...current,
            [person.id]: person
        });
        return person;
    }

    return {
        getPerson,
    }
}

export function usePersonTree(personId, getPerson) {
  const targetPersonId = personId;
  const [personTree, setPersonTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!targetPersonId) return;
    let cancelled = false;

    async function personWithParents(person, depth) {
        let parents = [];
        const family = person.famc?.[0];
        if (family) {
            for (const parentRef of [family.husband, family.wife]) {
                const parent = parentRef && await getPerson(parentRef.id);
                if (parent) {
                    if (depth>0) {
                        parents.push(await personWithParents(parent, depth - 1));
                    } else {
                        parents.push(parent);
                    }
                }
            }
        }
        return { ...person, parents };
    }

    async function personWithDescendants(person, depth) {
      if (depth <= 0) return person;
      const families = person.fams || [];
      const familiesWithDescendants = [];
      for (const family of families) {
        const children = family.children || [];
        const childrenWithDescendants = [];
        for (const childRef of children) {
          const child = childRef && await getPerson(childRef.id);
          if (child) {
            childrenWithDescendants.push(await personWithDescendants(child, depth - 1));
          }
        }
        familiesWithDescendants.push({ ...family, children: childrenWithDescendants });
      }
      return { ...person, families: familiesWithDescendants };
    }

    async function loadPersonTree() {
      try {
        setLoading(true);
        setError('');
        const person = await getPerson(targetPersonId);
        const personWithParentsTree = await personWithParents(person, 2);
        const personTree = await personWithDescendants(personWithParentsTree, 2);
        setPersonTree(personTree);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message);
          setPersonMap({});
          setPersonTree(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPersonTree();
    return () => { cancelled = true; };
  }, [targetPersonId]);

  return { loading, error, personTree };
}
