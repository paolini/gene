import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import ELK from 'elkjs/lib/elk.bundled.js';
import ReactFlow, { Background, Controls, Handle, MiniMap, Position } from 'reactflow';
import 'reactflow/dist/style.css';

const elk = new ELK();
const NODE_WIDTH = 300;

const personTreeQuery = `
  query PersonTree($id: ID!) {
    person(id: $id) {
      id
      name
      gedId
      sex
      birthDate
      deathDate
      famc {
        id
        gedId
        husband {
          id
          name
          gedId
          sex
          birthDate
          deathDate
          famc { id gedId }
          fams {
            id
            gedId
            husband { id name }
            wife { id name }
            children { id name gedId }
          }
        }
        wife {
          id
          name
          gedId
          sex
          birthDate
          deathDate
          famc { id gedId }
          fams {
            id
            gedId
            husband { id name }
            wife { id name }
            children { id name gedId }
          }
        }
        children { id name gedId }
      }
      fams {
        id
        gedId
        husband { id name }
        wife { id name }
        children {
          id
          name
          gedId
          sex
          birthDate
          deathDate
          famc { id gedId }
          fams { id gedId }
        }
      }
    }
  }
`;

function personName(person) {
  return person?.name || person?.gedId || 'Unknown person';
}

function spouseOf(family, personId) {
  return [family?.husband, family?.wife].find((candidate) => candidate && candidate.id !== personId) || null;
}

function PersonNode({ data }) {
  const person = data.person;
  const parentFamily = person.famc?.[0] || null;

  return (
    <div style={{ width: NODE_WIDTH, background: '#fffaf2', border: '1px solid #dac8b5', borderRadius: 16, padding: 16, boxShadow: '0 8px 24px rgba(78, 53, 32, 0.08)', position: 'relative', boxSizing: 'border-box' }}>
      <Handle type="target" position={Position.Top} id="top" style={{ background: '#7a4b2a', width: 10, height: 10 }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: '#365f48', width: 10, height: 10 }} />

      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{personName(person)}</div>
      <div style={{ fontSize: 12, color: '#6d5a48', marginBottom: 6 }}>{person.gedId} {person.sex ? `• ${person.sex}` : ''}</div>
      <div style={{ fontSize: 12, color: '#6d5a48', marginBottom: 12 }}>
        {person.birthDate ? `Born: ${person.birthDate}` : 'Birth date unknown'}
        {person.deathDate ? ` • Died: ${person.deathDate}` : ''}
      </div>

      <div style={{ marginBottom: 12 }}>
        <strong style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Parents</strong>
        {parentFamily ? (
          <>
            <div style={{ fontSize: 12, color: '#6d5a48', marginBottom: 6 }}>
              {[parentFamily.husband?.name, parentFamily.wife?.name].filter(Boolean).join(' and ') || parentFamily.gedId}
            </div>
            <button onClick={() => data.onExpandParents(person)} style={{ padding: '6px 8px', border: 0, borderRadius: 8, background: '#7a4b2a', color: '#fffaf2', cursor: 'pointer', fontSize: 12 }}>
              Show parents
            </button>
          </>
        ) : (
          <div style={{ fontSize: 12, color: '#8b7a69' }}>No parent family</div>
        )}
      </div>

      <div style={{ marginBottom: 12 }}>
        <strong style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Spouse families</strong>
        {person.fams?.length ? (
          <div style={{ display: 'grid', gap: 8 }}>
            {person.fams.map((family) => (
              <div key={family.id} style={{ background: '#fcf7ef', border: '1px solid #eadcc9', borderRadius: 10, padding: 10 }}>
                <div style={{ fontSize: 12, color: '#6d5a48', marginBottom: 4 }}>Spouse: {personName(spouseOf(family, person.id))}</div>
                <div style={{ fontSize: 12, color: '#6d5a48', marginBottom: 6 }}>
                  Children: {family.children?.length ? family.children.map((child) => personName(child)).join(', ') : 'None'}
                </div>
                <button onClick={() => data.onExpandDescendants(person, family)} style={{ padding: '6px 8px', border: 0, borderRadius: 8, background: '#365f48', color: '#f4f0e8', cursor: 'pointer', fontSize: 12 }}>
                  Show descendants
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#8b7a69' }}>No spouse families</div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link href={`/person/${person.id}`} style={{ color: '#7a4b2a', textDecoration: 'none', fontSize: 12 }}>
          Open detail
        </Link>
      </div>
    </div>
  );
}

const nodeTypes = { personNode: PersonNode };

function estimateNodeHeight(person) {
  const spouseFamilyCount = person.fams?.length || 0;
  const hasParentFamily = Boolean(person.famc?.[0]);

  return 220 + (hasParentFamily ? 70 : 35) + (spouseFamilyCount ? spouseFamilyCount * 110 : 35);
}

function buildFallbackNodes(personMap) {
  return Object.values(personMap).map((entry) => ({
    id: entry.person.id,
    type: 'personNode',
    position: { x: entry.x * 380, y: entry.level * 360 },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    data: { person: entry.person }
  }));
}

async function buildElkLayout(personMap, edges, rootId) {
  const entries = Object.values(personMap);

  if (!entries.length) {
    return [];
  }

  if (!edges.length) {
    return buildFallbackNodes(personMap);
  }

  const elkGraph = {
    id: 'gene-tree',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.layered.considerModelOrder': 'NODES_AND_EDGES',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.spacing.nodeNode': '70',
      'elk.layered.spacing.nodeNodeBetweenLayers': '120'
    },
    children: entries.map((entry) => ({
      id: entry.person.id,
      width: NODE_WIDTH,
      height: estimateNodeHeight(entry.person)
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target]
    }))
  };

  const layout = await elk.layout(elkGraph);
  const positionedNodes = new Map((layout.children || []).map((node) => [node.id, node]));
  const rootNode = positionedNodes.get(rootId);
  const rootOffsetX = rootNode?.x || 0;
  const rootOffsetY = rootNode?.y || 0;

  return entries.map((entry) => {
    const positionedNode = positionedNodes.get(entry.person.id);

    return {
      id: entry.person.id,
      type: 'personNode',
      position: {
        x: (positionedNode?.x || 0) - rootOffsetX,
        y: (positionedNode?.y || 0) - rootOffsetY
      },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      data: { person: entry.person }
    };
  });
}

export default function PersonTreePage() {
  const router = useRouter();
  const { id } = router.query;
  const [personMap, setPersonMap] = useState({});
  const [edges, setEdges] = useState([]);
  const [nodes, setNodes] = useState([]);
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
    if (!id) {
      return;
    }

    let cancelled = false;

    async function loadRoot() {
      try {
        setLoading(true);
        setError('');
        const person = await fetchPerson(id);
        if (cancelled) {
          return;
        }
        setPersonMap(person ? { [person.id]: { person, level: 0, x: 0 } } : {});
        setEdges([]);
        setNodes(person ? buildFallbackNodes({ [person.id]: { person, level: 0, x: 0 } }) : []);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message);
          setPersonMap({});
          setNodes([]);
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

  useEffect(() => {
    let cancelled = false;

    async function layoutNodes() {
      try {
        const nextNodes = await buildElkLayout(personMap, edges, id);
        if (!cancelled) {
          setNodes(nextNodes.map((node) => ({
            ...node,
            data: {
              ...node.data,
              onExpandParents: expandParents,
              onExpandDescendants: expandDescendants
            }
          })));
        }
      } catch {
        if (!cancelled) {
          setNodes(buildFallbackNodes(personMap).map((node) => ({
            ...node,
            data: {
              ...node.data,
              onExpandParents: expandParents,
              onExpandDescendants: expandDescendants
            }
          })));
        }
      }
    }

    layoutNodes();

    return () => {
      cancelled = true;
    };
  }, [edges, id, personMap]);

  async function ensurePersonNode(personId, level, x) {
    if (!personId || personMap[personId]) {
      return personMap[personId]?.person || null;
    }
    const person = await fetchPerson(personId);
    setPersonMap((current) => current[person.id] ? current : {
      ...current,
      [person.id]: { person, level, x }
    });
    return person;
  }

  async function expandParents(person) {
    const sourceEntry = personMap[person.id];
    const family = person.famc?.[0];
    if (!sourceEntry || !family) {
      return;
    }

    const parents = [family.husband, family.wife].filter(Boolean);
    for (const [index, parentRef] of parents.entries()) {
      const parent = await ensurePersonNode(parentRef.id, sourceEntry.level - 1, sourceEntry.x + (index === 0 ? -1 : 1));
      if (!parent) {
        continue;
      }
      setEdges((current) => current.some((edge) => edge.id === `${parent.id}-${person.id}`)
        ? current
        : current.concat({
            id: `${parent.id}-${person.id}`,
            source: parent.id,
            sourceHandle: 'bottom',
            target: person.id,
            targetHandle: 'top',
            type: 'smoothstep',
            style: { stroke: '#9a6f4a', strokeWidth: 2 }
          }));
    }
  }

  async function expandDescendants(person, family) {
    const sourceEntry = personMap[person.id];
    if (!sourceEntry) {
      return;
    }

    for (const [index, childRef] of (family.children || []).entries()) {
      const child = await ensurePersonNode(childRef.id, sourceEntry.level + 1, sourceEntry.x + index - Math.floor((family.children.length || 1) / 2));
      if (!child) {
        continue;
      }
      setEdges((current) => current.some((edge) => edge.id === `${person.id}-${family.id}-${child.id}`)
        ? current
        : current.concat({
            id: `${person.id}-${family.id}-${child.id}`,
            source: person.id,
            sourceHandle: 'bottom',
            target: child.id,
            targetHandle: 'top',
            type: 'smoothstep',
            style: { stroke: '#4f7c63', strokeWidth: 2 }
          }));
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: 'Georgia, serif', background: 'linear-gradient(180deg, #efe5d5 0%, #faf6ef 100%)', minHeight: '100vh', color: '#2f2419' }}>
      <div style={{ maxWidth: 1500, margin: '0 auto' }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: '#7a4b2a', textDecoration: 'none' }}>← Back to search</Link>
          <div style={{ color: '#6d5a48' }}>Interactive person-centered tree. Expand parents or descendants from each person card.</div>
        </div>

        {loading ? <div>Loading tree...</div> : null}
        {!loading && error ? <div style={{ color: '#8b2d2d' }}>{error}</div> : null}
        {!loading && !error && nodes.length === 0 ? <div>No person found.</div> : null}

        {!loading && !error && nodes.length > 0 ? (
          <div style={{ height: '80vh', background: '#fffaf2', border: '1px solid #e1d4c1', borderRadius: 18, overflow: 'hidden' }}>
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
