import Link from 'next/link';
import { getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';
import { personTreeNodeTypes } from '../../../components/tree/PersonTreeNode';
import { buildElkLayout, buildFallbackNodes, buildGraphModel, spouseOf } from '../../../lib/personTreeLayout';

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
        husband {
          id
          name
          gedId
          sex
          birthDate
          deathDate
          media { file isPrimary title }
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
          media { file isPrimary title }
          famc { id gedId }
          fams {
            id
            gedId
            husband { id name }
            wife { id name }
            children { id name gedId }
          }
        }
        children { id name gedId media { file isPrimary title } }
      }
      fams {
        id
        gedId
        husband { id name media { file isPrimary title } }
        wife { id name media { file isPrimary title } }
        children {
          id
          name
          gedId
          sex
          birthDate
          deathDate
          media { file isPrimary title }
          famc { id gedId }
          fams { id gedId }
        }
      }
    }
  }
`;


export default function PersonTreePage() {
  const router = useRouter();
  const { id } = router.query;
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

    return () => {
      cancelled = true;
    };
  }, [graphModel, id]);

  async function ensurePersonNode(personId, level, x, options = {}) {
    if (!personId || personMap[personId]) {
      return personMap[personId]?.person || null;
    }

    const person = await fetchPerson(personId);
    setPersonMap((current) => current[person.id] ? current : {
      ...current,
      [person.id]: { person, level, x, showParentControls: options.showParentControls !== false }
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
      await ensurePersonNode(parentRef.id, sourceEntry.level - 1, sourceEntry.x + (index === 0 ? -1 : 1), { showParentControls: true });
    }

    setExpandedParentFamilyIds((current) => current.includes(family.id) ? current : current.concat(family.id));
  }

  async function expandDescendants(person, family) {
    const sourceEntry = personMap[person.id];
    if (!sourceEntry) {
      return;
    }

    const spouse = spouseOf(family, person.id);
    if (spouse?.id) {
      await ensurePersonNode(spouse.id, sourceEntry.level, sourceEntry.x + 1, { showParentControls: true });
    }

    for (const [index, childRef] of (family.children || []).entries()) {
      await ensurePersonNode(childRef.id, sourceEntry.level + 1, sourceEntry.x + index - Math.floor((family.children.length || 1) / 2), { showParentControls: false });
    }

    setExpandedDescFamilyIds((current) => current.includes(family.id) ? current : current.concat(family.id));
  }

  return (
    <div style={{ padding: 20, fontFamily: 'Georgia, serif', background: 'linear-gradient(180deg, #efe5d5 0%, #faf6ef 100%)', minHeight: '100vh', color: '#2f2419' }}>
      <div style={{ maxWidth: 1500, margin: '0 auto' }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: '#7a4b2a', textDecoration: 'none' }}>← torna alla ricerca</Link>
          <div style={{ color: '#6d5a48' }}>Espandi i genitori o i discendenti da ogni scheda della persona.</div>
        </div>
        {loading ? <div>Loading tree...</div> : null}
        {!loading && error ? <div style={{ color: '#8b2d2d' }}>{error}</div> : null}
        {!loading && !error && nodes.length === 0 ? <div>No person found.</div> : null}

        {!loading && !error && nodes.length > 0 ? (
          <div style={{ height: '80vh', background: '#fffaf2', border: '1px solid #e1d4c1', borderRadius: 18, overflow: 'hidden' }}>
            <ReactFlow nodes={nodes} edges={renderedEdges} fitView nodeTypes={personTreeNodeTypes} nodesDraggable>
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
