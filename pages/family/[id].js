import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, Handle, MiniMap, Position } from 'reactflow';
import 'reactflow/dist/style.css';

const familyQuery = `
  query Family($id: ID!) {
    family(id: $id) {
      id
      gedId
      husband {
        id
        name
        gedId
        famc { id gedId }
        fams { id gedId }
      }
      wife {
        id
        name
        gedId
        famc { id gedId }
        fams { id gedId }
      }
      children {
        id
        name
        gedId
        famc { id gedId }
        fams { id gedId }
      }
    }
  }
`;

function personLabel(person) {
  return person?.name || person?.gedId || 'Unknown person';
}

function familyLabel(family) {
  return family?.gedId || 'Unnamed family';
}

function PersonCard({ data }) {
  const person = data.person;

  return (
    <div style={{ minWidth: 190, background: '#f8f4ec', border: '1px solid #d7ccb9', borderRadius: 12, padding: 12, boxShadow: '0 6px 18px rgba(78, 53, 32, 0.08)', position: 'relative' }}>
      <Handle type="target" position={Position.Top} id="top" style={{ background: '#6f8d79', width: 9, height: 9 }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: '#365f48', width: 9, height: 9 }} />
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{personLabel(person)}</div>
      <div style={{ fontSize: 12, color: '#6d5a48', marginBottom: 8 }}>{person.gedId || 'No GEDCOM id'}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link href={`/person/${person.id}`} style={{ color: '#7a4b2a', textDecoration: 'none', fontSize: 12 }}>
          Open person
        </Link>
      </div>
    </div>
  );
}

function FamilyCard({ data }) {
  const family = data.family;

  return (
    <div style={{ minWidth: 230, background: '#fffaf2', border: '1px solid #d9c7b3', borderRadius: 14, padding: 14, boxShadow: '0 8px 24px rgba(78, 53, 32, 0.08)', position: 'relative' }}>
      <Handle type="target" position={Position.Top} id="top" style={{ background: '#7a4b2a', width: 10, height: 10 }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: '#365f48', width: 10, height: 10 }} />
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{familyLabel(family)}</div>
      <div style={{ fontSize: 13, color: '#6d5a48', marginBottom: 4 }}>Husband: {personLabel(family.husband)}</div>
      <div style={{ fontSize: 13, color: '#6d5a48', marginBottom: 8 }}>Wife: {personLabel(family.wife)}</div>
      <div style={{ fontSize: 13, color: '#6d5a48', marginBottom: 8 }}>
        Children: {family.children?.length ? family.children.map((child) => personLabel(child)).join(', ') : 'None'}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {family.husband?.famc?.[0]?.id ? (
          <button onClick={() => data.onExpandAncestors(family.id, family.husband.famc[0].id, 'husband')} style={{ padding: '6px 8px', border: 0, borderRadius: 8, background: '#7a4b2a', color: '#fffaf2', cursor: 'pointer' }}>
            Husband ancestors
          </button>
        ) : null}
        {family.wife?.famc?.[0]?.id ? (
          <button onClick={() => data.onExpandAncestors(family.id, family.wife.famc[0].id, 'wife')} style={{ padding: '6px 8px', border: 0, borderRadius: 8, background: '#7a4b2a', color: '#fffaf2', cursor: 'pointer' }}>
            Wife ancestors
          </button>
        ) : null}
        {family.children?.length ? (
          <button onClick={() => data.onExpandDescendants(family.id, family.children)} style={{ padding: '6px 8px', border: 0, borderRadius: 8, background: '#365f48', color: '#f4f0e8', cursor: 'pointer' }}>
            Descendants
          </button>
        ) : null}
      </div>
    </div>
  );
}

const nodeTypes = { familyCard: FamilyCard, personCard: PersonCard };

export default function FamilyPage() {
  const router = useRouter();
  const { id } = router.query;
  const [familyMap, setFamilyMap] = useState({});
  const [personMap, setPersonMap] = useState({});
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchFamily(familyId) {
    const res = await fetch('/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: familyQuery, variables: { id: familyId } })
    });
    const json = await res.json();
    if (json.errors?.length) {
      throw new Error(json.errors[0].message || 'Failed to load family');
    }
    return json.data?.family || null;
  }

  useEffect(() => {
    if (!id) {
      return;
    }

    let cancelled = false;

    async function loadRoot() {
      try {
        setLoading(true);
        setError('');
        const family = await fetchFamily(id);
        if (cancelled) {
          return;
        }
        setFamilyMap(family ? { [family.id]: { family, level: 0, x: 0 } } : {});
        setPersonMap({});
        setEdges([]);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message);
          setFamilyMap({});
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRoot();

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function expandAncestor(sourceFamilyId, targetFamilyId, role) {
    if (!targetFamilyId || familyMap[targetFamilyId]) {
      return;
    }
    const sourceEntry = familyMap[sourceFamilyId];
    if (!sourceEntry) {
      return;
    }

    const family = await fetchFamily(targetFamilyId);
    setFamilyMap((current) => ({
      ...current,
      [family.id]: {
        family,
        level: sourceEntry.level - 1,
        x: sourceEntry.x + (role === 'husband' ? -1 : 1)
      }
    }));
    setEdges((current) => current.some((edge) => edge.id === `${targetFamilyId}-${sourceFamilyId}`)
      ? current
      : current.concat({
        id: `${targetFamilyId}-${sourceFamilyId}`,
        source: targetFamilyId,
        sourceHandle: 'bottom',
        target: sourceFamilyId,
        targetHandle: 'top',
        type: 'smoothstep',
        style: { stroke: '#9a6f4a', strokeWidth: 2 }
      }));
  }

  async function expandDescendants(sourceFamilyId, children) {
    const sourceEntry = familyMap[sourceFamilyId];
    if (!sourceEntry) {
      return;
    }

    for (const [index, child] of (children || []).entries()) {
      const childNodeId = `person-${child.id}`;
      setPersonMap((current) => current[childNodeId]
        ? current
        : {
            ...current,
            [childNodeId]: {
              person: child,
              level: sourceEntry.level + 1,
              x: sourceEntry.x + index - Math.floor((children.length || 1) / 2)
            }
          });
      setEdges((current) => current.some((edge) => edge.id === `${sourceFamilyId}-${childNodeId}`)
        ? current
        : current.concat({
            id: `${sourceFamilyId}-${childNodeId}`,
            source: sourceFamilyId,
            sourceHandle: 'bottom',
            target: childNodeId,
            targetHandle: 'top',
            type: 'smoothstep',
            style: { stroke: '#6f8d79', strokeWidth: 2 }
          }));

      for (const familyRef of child.fams || []) {
        if (!familyRef?.id || familyMap[familyRef.id]) {
          continue;
        }
        const family = await fetchFamily(familyRef.id);
        setFamilyMap((current) => ({
          ...current,
          [family.id]: {
            family,
            level: sourceEntry.level + 2,
            x: sourceEntry.x + index - Math.floor((children.length || 1) / 2)
          }
        }));
        setEdges((current) => current.some((edge) => edge.id === `${childNodeId}-${family.id}`)
          ? current
          : current.concat({
            id: `${childNodeId}-${family.id}`,
            source: childNodeId,
            sourceHandle: 'bottom',
            target: family.id,
            targetHandle: 'top',
            type: 'smoothstep',
            style: { stroke: '#4f7c63', strokeWidth: 2 }
          }));
      }
    }
  }

  const nodes = useMemo(
    () => [
      ...Object.values(familyMap).map((entry) => ({
        id: entry.family.id,
        type: 'familyCard',
        position: { x: entry.x * 320, y: entry.level * 240 },
        data: {
          family: entry.family,
          onExpandAncestors: expandAncestor,
          onExpandDescendants: expandDescendants
        }
      })),
      ...Object.entries(personMap).map(([nodeId, entry]) => ({
        id: nodeId,
        type: 'personCard',
        position: { x: entry.x * 320, y: entry.level * 240 },
        data: { person: entry.person }
      }))
    ],
    [familyMap, personMap]
  );

  return (
    <div style={{ padding: 20, fontFamily: 'Georgia, serif', background: 'linear-gradient(180deg, #efe5d5 0%, #faf6ef 100%)', minHeight: '100vh', color: '#2f2419' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: '#7a4b2a', textDecoration: 'none' }}>← Back to search</Link>
          <div style={{ color: '#6d5a48' }}>Interactive family tree. Expand ancestors or descendants from each family card.</div>
        </div>

        {loading ? <div>Loading family tree...</div> : null}
        {!loading && error ? <div style={{ color: '#8b2d2d' }}>{error}</div> : null}
        {!loading && !error && nodes.length === 0 ? <div>No family found.</div> : null}

        {!loading && !error && nodes.length > 0 ? (
          <div style={{ height: '78vh', background: '#fffaf2', border: '1px solid #e1d4c1', borderRadius: 18, overflow: 'hidden' }}>
            <ReactFlow nodes={nodes} edges={edges} fitView nodeTypes={nodeTypes} nodesDraggable>
              <MiniMap pannable zoomable />
              <Controls />
              <Background color="#d8c4a8" gap={24} />
            </ReactFlow>
          </div>
        ) : null}
      </div>
    </div>
  );
}
