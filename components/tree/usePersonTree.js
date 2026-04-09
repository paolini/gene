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

export function usePersonTree(personId) {
  const targetPersonId = personId;
  const [personMap, setPersonMap] = useState({});
  const [personTree, setPersonTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  useEffect(() => {
    if (!targetPersonId) return;
    let cancelled = false;

    async function getPerson(personId) {
      if (personMap[personId]) return personMap[personId];
      const person = await fetchPerson(personId);
      if (cancelled) return null;
      setPersonMap((current) => current[person.id] ? current : {
        ...current,
        [person.id]: person
      });
      return person;
    }

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

    async function loadPersonTree() {
      try {
        setLoading(true);
        setError('');
        const person = await getPerson(targetPersonId);
        const personTree = await personWithParents(person, 2);
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

/*

export function usePersonTreeOld(personId) {
  const id = personId;
  const [personMap, setPersonMap] = useState({});
  const [expandedParentFamilyIds, setExpandedParentFamilyIds] = useState([]);
  const [expandedDescFamilyIds, setExpandedDescFamilyIds] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [renderedEdges, setRenderedEdges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const graphModel = useMemo(
    () => buildGraphModel(personMap, expandedParentFamilyIds, expandedDescFamilyIds),
    [expandedDescFamilyIds, expandedParentFamilyIds, personMap]
  );

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

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function loadRoot() {
      try {
        setLoading(true);
        setError('');
        const person = await fetchPerson(id);
        if (cancelled) return;
        setPersonMap(person ? { [person.id]: { person, level: 0, x: 0, showParentControls: true } } : {});
        setExpandedParentFamilyIds([]);
        setExpandedDescFamilyIds([]);
        setNodes(person ? buildFallbackNodes(buildGraphModel({ [person.id]: { person, level: 0, x: 0, showParentControls: true } }, [], []).nodes) : []);
        setRenderedEdges([]);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message);
          setPersonMap({});
          setNodes([]);
          setRenderedEdges([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRoot();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    async function layoutNodes() {
      try {
        const layoutResult = await buildElkLayout(graphModel.nodes, graphModel.edges, id);
        if (!cancelled) {
          setNodes(layoutResult.nodes.map((node) => ({
            ...node,
            data: {
              ...node.data,
              onExpandParents: expandParents,
              onExpandDescendants: expandDescendants
            }
          })));
          setRenderedEdges(layoutResult.edges);
        }
      } catch {
        if (!cancelled) {
          setNodes(buildFallbackNodes(graphModel.nodes).map((node) => ({
            ...node,
            data: {
              ...node.data,
              onExpandParents: expandParents,
              onExpandDescendants: expandDescendants
            }
          })));
          setRenderedEdges(graphModel.edges);
        }
      }
    }

    layoutNodes();
    return () => { cancelled = true; };
  }, [graphModel, id]);

  async function ensurePersonNode(personId, level, x, options = {}) {
    if (!personId || personMap[personId]) return personMap[personId]?.person || null;
    const person = await fetchPerson(personId);
    setPersonMap((current) => current[person.id] ? current : {
      ...current,
      [person.id]: { person, level, x, showParentControls: options.showParentControls !== false }
    });
    return person;
  }

  function shiftLevelEntriesRight(level, minXExclusive, delta, excludeIds = []) {
    const excludeIdSet = new Set(excludeIds);
    setPersonMap((current) => {
      const updatedEntries = Object.entries(current).map(([entryId, entry]) => {
        if (excludeIdSet.has(entryId) || entry.level !== level || entry.x <= minXExclusive) {
          return [entryId, entry];
        }
        return [entryId, { ...entry, x: entry.x + delta }];
      });
      return Object.fromEntries(updatedEntries);
    });
  }

  async function expandParents(person) {
    const sourceEntry = personMap[person.id];
    const family = person.famc?.[0];
    if (!sourceEntry || !family) return;
    const parents = [family.husband, family.wife].filter(Boolean);
    for (const [index, parentRef] of parents.entries()) {
      await ensurePersonNode(parentRef.id, sourceEntry.level - 1, sourceEntry.x + (index === 0 ? -1 : 1), { showParentControls: true });
    }
    setExpandedParentFamilyIds((current) => current.includes(family.id) ? current : current.concat(family.id));
  }

  async function expandDescendants(person, family) {
    const sourceEntry = personMap[person.id];
    if (!sourceEntry) return;
    const familyChildren = family.children || [];
    const anchorChild = familyChildren.find((child) => personMap[child.id]);
    const anchorChildIndex = anchorChild ? familyChildren.findIndex((child) => child.id === anchorChild.id) : -1;
    const anchorChildX = anchorChild ? personMap[anchorChild.id].x : null;
    const spouse = spouseOf(family, person.id);
    if (spouse?.id) {
      const spouseExists = Boolean(personMap[spouse.id]);
      if (!spouseExists) shiftLevelEntriesRight(sourceEntry.level, sourceEntry.x, 1, [person.id]);
      await ensurePersonNode(spouse.id, sourceEntry.level, sourceEntry.x + SPOUSE_X_OFFSET, { showParentControls: true });
    }
    for (const [index, childRef] of familyChildren.entries()) {
      const childX = anchorChildIndex >= 0 && anchorChildX !== null
        ? anchorChildX + (index - anchorChildIndex)
        : sourceEntry.x + index - ((familyChildren.length - 1) / 2);
      await ensurePersonNode(childRef.id, sourceEntry.level + 1, childX, { showParentControls: false });
    }
    setExpandedDescFamilyIds((current) => current.includes(family.id) ? current : current.concat(family.id));
  }

  return { loading, error, nodes, renderedEdges };
}

*/