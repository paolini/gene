import Link from 'next/link';
import { getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import ELK from 'elkjs/lib/elk.bundled.js';
import ReactFlow, { Background, Controls, Handle, MiniMap, Position } from 'reactflow';
import 'reactflow/dist/style.css';
import AuthStatus from '../../../components/AuthStatus';
import { formatPersonNameText, renderPersonLifeDates, renderPersonName, renderPersonSex } from '../../../lib/personName';

const elk = new ELK();
const NODE_WIDTH = 250;
const FAMILY_NODE_SIZE = 22;

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
  return formatPersonNameText(person?.name, person?.gedId || 'Unknown person');
}

function spouseOf(family, personId) {
  return [family?.husband, family?.wife].find((candidate) => candidate && candidate.id !== personId) || null;
}

function PersonNode({ data }) {
  const person = data.person;
  const parentFamily = person.famc?.[0] || null;
  const showParents = data.showParentControls && parentFamily && !data.parentsExpanded;
  const families = (person.fams || []).filter((family) => !data.expandedFamilyIds?.has(family.id));

  return (
    <div style={{ width: NODE_WIDTH, background: '#fffaf2', border: '1px solid #dac8b5', borderRadius: 14, padding: 12, boxShadow: '0 8px 24px rgba(78, 53, 32, 0.08)', position: 'relative', boxSizing: 'border-box' }}>
      {data.hasTopHandle ? <Handle type="target" position={Position.Top} id="top" style={{ background: '#7a4b2a', width: 10, height: 10 }} /> : null}
      {data.hasBottomHandle ? <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: '#365f48', width: 10, height: 10 }} /> : null}
      {data.hasLeftHandle ? <Handle type="source" position={Position.Left} id="left" style={{ background: '#7a4b2a', width: 8, height: 8 }} /> : null}
      {data.hasRightHandle ? <Handle type="source" position={Position.Right} id="right" style={{ background: '#7a4b2a', width: 8, height: 8 }} /> : null}

      <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.2, marginBottom: showParents || families.length ? 10 : 4 }}>
        <Link href={`/person/${person.id}`} style={{ color: '#2f2419', textDecoration: 'none' }}>
          {renderPersonSex(person)}
          {renderPersonName(person?.name, person?.gedId || 'Unknown person')}
          {renderPersonLifeDates(person)}
        </Link>
      </div>

      {showParents ? (
        <div style={{ marginBottom: families.length ? 10 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <strong style={{ display: 'block', fontSize: 12 }}>Parents</strong>
            <button onClick={() => data.onExpandParents(person)} style={{ padding: '3px 7px', border: 0, borderRadius: 8, background: '#7a4b2a', color: '#fffaf2', cursor: 'pointer', fontSize: 10 }}>
              Expand
            </button>
          </div>
          <div style={{ fontSize: 11, color: '#6d5a48', marginBottom: 6, lineHeight: 1.35 }}>
            {[parentFamily.husband, parentFamily.wife].filter(Boolean).length > 0
              ? [parentFamily.husband, parentFamily.wife].filter(Boolean).map((parent, index) => (
                  <span key={parent.id || `${parent.name}-${index}`}>
                    {index > 0 ? ' and ' : ''}
                    {renderPersonName(parent.name, parent.id)}
                  </span>
                ))
              : parentFamily.gedId}
          </div>
        </div>
      ) : null}

      {families.length ? (
        <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
          {families.map((family) => (
            <div key={family.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 11, color: '#6d5a48', lineHeight: 1.35, flexWrap: 'wrap' }}>
                <span>
                  Family with <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2, color: '#2f2419' }}>{renderPersonName(spouseOf(family, person.id)?.name, spouseOf(family, person.id)?.gedId || 'Unknown person')}</span>
                </span>
                <button onClick={() => data.onExpandDescendants(person, family)} style={{ padding: '3px 7px', border: 0, borderRadius: 8, background: '#365f48', color: '#f4f0e8', cursor: 'pointer', fontSize: 10 }}>
                  Expand
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FamilyNode() {
  return (
    <div style={{ width: FAMILY_NODE_SIZE, height: FAMILY_NODE_SIZE, borderRadius: '50%', background: '#c59f74', border: '2px solid #7a4b2a', boxShadow: '0 6px 14px rgba(78, 53, 32, 0.12)', position: 'relative', boxSizing: 'border-box' }}>
      <Handle type="target" position={Position.Left} id="left" style={{ background: '#7a4b2a', width: 8, height: 8, left: -5 }} />
      <Handle type="target" position={Position.Right} id="right" style={{ background: '#7a4b2a', width: 8, height: 8, right: -5 }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: '#365f48', width: 8, height: 8, bottom: -5 }} />
    </div>
  );
}

const nodeTypes = { personNode: PersonNode, familyNode: FamilyNode };

function estimateNodeHeight(person, layoutState) {
  const showParents = Boolean(person.famc?.[0]) && !layoutState.parentsExpanded;
  const visibleFamilyCount = (person.fams || []).filter((family) => !layoutState.expandedFamilyIds.has(family.id)).length;

  return 112 + (showParents ? 58 : 0) + (visibleFamilyCount ? visibleFamilyCount * 56 : 0);
}

function getLayoutState(personId, person, edges) {
  const parentsExpanded = edges.some((edge) => edge.target === personId);
  const expandedFamilyIds = new Set(
    (person.fams || [])
      .filter((family) => edges.some((edge) => edge.id.startsWith(`${personId}-${family.id}-`)))
      .map((family) => family.id)
  );

  return { parentsExpanded, expandedFamilyIds };
}

function familyNodeId(familyId) {
  return `family:${familyId}`;
}

function findFamilyInPersonMap(personMap, familyId) {
  for (const entry of Object.values(personMap)) {
    const family = [...(entry.person.famc || []), ...(entry.person.fams || [])].find((candidate) => candidate.id === familyId);
    if (family) {
      return family;
    }
  }

  return null;
}

function buildGraphModel(personMap, expandedParentFamilyIds, expandedDescFamilyIds) {
  const personEntries = Object.values(personMap);
  const expandedFamilyIds = [...new Set([...expandedParentFamilyIds, ...expandedDescFamilyIds])];
  const graphEdges = [];

  const personNodes = personEntries.map((entry) => {
    const layoutState = getLayoutState(entry.person.id, entry.person, graphEdges);

    return {
      id: entry.person.id,
      type: 'personNode',
      fallbackPosition: { x: entry.x * 380, y: entry.level * 320 },
      width: NODE_WIDTH,
      height: estimateNodeHeight(entry.person, {
        parentsExpanded: expandedParentFamilyIds.includes(entry.person.famc?.[0]?.id),
        expandedFamilyIds: new Set(expandedDescFamilyIds)
      }),
      data: {
        person: entry.person,
        parentsExpanded: expandedParentFamilyIds.includes(entry.person.famc?.[0]?.id),
        expandedFamilyIds: new Set(expandedDescFamilyIds),
        showParentControls: entry.showParentControls !== false,
        hasTopHandle: expandedParentFamilyIds.includes(entry.person.famc?.[0]?.id),
        hasBottomHandle: (entry.person.fams || []).some((family) => expandedDescFamilyIds.includes(family.id)),
        hasLeftHandle: false,
        hasRightHandle: false
      }
    };
  });

  const familyNodes = expandedFamilyIds
    .map((familyId) => findFamilyInPersonMap(personMap, familyId))
    .filter(Boolean)
    .map((family) => ({
      id: familyNodeId(family.id),
      type: 'familyNode',
      fallbackPosition: { x: 0, y: 0 },
      width: FAMILY_NODE_SIZE,
      height: FAMILY_NODE_SIZE,
      data: { family }
    }));

  for (const familyId of expandedFamilyIds) {
    const family = findFamilyInPersonMap(personMap, familyId);
    if (!family) {
      continue;
    }

    const connectorId = familyNodeId(family.id);

    if (family.husband?.id && personMap[family.husband.id]) {
      const husbandNode = personNodes.find((node) => node.id === family.husband.id);
      if (husbandNode) {
        husbandNode.data.hasRightHandle = true;
      }
      graphEdges.push({
        id: `${family.husband.id}-${connectorId}`,
        source: family.husband.id,
        sourceHandle: 'right',
        target: connectorId,
        targetHandle: 'left',
        type: 'straight',
        style: { stroke: '#9a6f4a', strokeWidth: 2 }
      });
    }

    if (family.wife?.id && personMap[family.wife.id]) {
      const wifeNode = personNodes.find((node) => node.id === family.wife.id);
      if (wifeNode) {
        wifeNode.data.hasLeftHandle = true;
      }
      graphEdges.push({
        id: `${family.wife.id}-${connectorId}`,
        source: family.wife.id,
        sourceHandle: 'left',
        target: connectorId,
        targetHandle: 'right',
        type: 'straight',
        style: { stroke: '#9a6f4a', strokeWidth: 2 }
      });
    }

    for (const child of family.children || []) {
      if (!personMap[child.id]) {
        continue;
      }

      graphEdges.push({
        id: `${connectorId}-${child.id}`,
        source: connectorId,
        sourceHandle: 'bottom',
        target: child.id,
        targetHandle: 'top',
        type: 'smoothstep',
        style: { stroke: '#4f7c63', strokeWidth: 2 }
      });
    }
  }

  return {
    nodes: [...personNodes, ...familyNodes],
    edges: graphEdges
  };
}

function buildFallbackNodes(graphNodes) {
  return graphNodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.fallbackPosition,
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    data: node.data
  }));
}

function alignFamilyNodes(graphNodes, positionedNodes, edges) {
  const alignedNodes = new Map(positionedNodes.map((node) => [node.id, { ...node }]));

  for (const node of graphNodes) {
    if (node.type !== 'familyNode') {
      continue;
    }

    const familyEdges = edges.filter((edge) => edge.target === node.id);
    const spouseNodes = familyEdges
      .map((edge) => alignedNodes.get(edge.source))
      .filter(Boolean);

    if (!spouseNodes.length) {
      continue;
    }

    const familyNode = alignedNodes.get(node.id);
    const averageCenterY = spouseNodes.reduce((sum, spouseNode) => sum + spouseNode.y + (spouseNode.height || 0) / 2, 0) / spouseNodes.length;

    familyNode.y = averageCenterY - (familyNode.height || 0) / 2;

    if (spouseNodes.length === 2) {
      const leftSpouse = spouseNodes[0].x <= spouseNodes[1].x ? spouseNodes[0] : spouseNodes[1];
      const rightSpouse = spouseNodes[0].x > spouseNodes[1].x ? spouseNodes[0] : spouseNodes[1];
      const leftCenterX = leftSpouse.x + (leftSpouse.width || 0);
      const rightCenterX = rightSpouse.x;

      familyNode.x = (leftCenterX + rightCenterX) / 2 - (familyNode.width || 0) / 2;
    }
  }

  return [...alignedNodes.values()];
}

function resolveRenderedEdges(edges, positionedNodes) {
  const nodeMap = new Map(positionedNodes.map((node) => [node.id, node]));

  return edges.map((edge) => {
    if (!edge.target.startsWith('family:')) {
      return edge;
    }

    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    if (!sourceNode || !targetNode) {
      return edge;
    }

    const sourceCenterX = sourceNode.x + (sourceNode.width || 0) / 2;
    const targetCenterX = targetNode.x + (targetNode.width || 0) / 2;
    const sourceIsLeftOfTarget = sourceCenterX <= targetCenterX;
    const sourceHandle = sourceIsLeftOfTarget ? 'right' : 'left';
    const targetHandle = sourceIsLeftOfTarget ? 'left' : 'right';

    return {
      ...edge,
      sourceHandle,
      targetHandle
    };
  });
}

function applyHandleVisibility(nodes, edges) {
  const visibleHandlesByNode = new Map();

  for (const edge of edges) {
    if (edge.sourceHandle) {
      const sourceHandles = visibleHandlesByNode.get(edge.source) || new Set();
      sourceHandles.add(edge.sourceHandle);
      visibleHandlesByNode.set(edge.source, sourceHandles);
    }

    if (edge.targetHandle) {
      const targetHandles = visibleHandlesByNode.get(edge.target) || new Set();
      targetHandles.add(edge.targetHandle);
      visibleHandlesByNode.set(edge.target, targetHandles);
    }
  }

  return nodes.map((node) => {
    if (node.type !== 'personNode') {
      return node;
    }

    const visibleHandles = visibleHandlesByNode.get(node.id) || new Set();

    return {
      ...node,
      data: {
        ...node.data,
        hasTopHandle: visibleHandles.has('top'),
        hasBottomHandle: visibleHandles.has('bottom'),
        hasLeftHandle: visibleHandles.has('left'),
        hasRightHandle: visibleHandles.has('right')
      }
    };
  });
}

async function buildElkLayout(graphNodes, edges, rootId) {
  const rootNodeId = rootId;

  if (!graphNodes.length) {
    return [];
  }

  if (!edges.length) {
    return buildFallbackNodes(graphNodes);
  }

  const elkGraph = {
    id: 'gene-tree',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.layered.considerModelOrder': 'NODES_AND_EDGES',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.spacing.nodeNode': '70',
      'elk.layered.spacing.nodeNodeBetweenLayers': '120'
    },
    children: graphNodes.map((node) => ({
      id: node.id,
      width: node.width,
      height: node.height
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target]
    }))
  };

  const layout = await elk.layout(elkGraph);
  const alignedNodes = alignFamilyNodes(graphNodes, layout.children || [], edges);
  const positionedNodes = new Map(alignedNodes.map((node) => [node.id, node]));
  const rootNode = positionedNodes.get(rootNodeId);
  const rootOffsetX = rootNode?.x || 0;
  const rootOffsetY = rootNode?.y || 0;

  const renderedNodes = graphNodes.map((node) => {
    const positionedNode = positionedNodes.get(node.id);

    return {
      id: node.id,
      type: node.type,
      position: {
        x: (positionedNode?.x || 0) - rootOffsetX,
        y: (positionedNode?.y || 0) - rootOffsetY
      },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      data: node.data
    };
  });

  const renderedEdges = resolveRenderedEdges(edges, alignedNodes);

  return {
    nodes: applyHandleVisibility(renderedNodes, renderedEdges),
    edges: renderedEdges
  };
}

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
          <Link href="/" style={{ color: '#7a4b2a', textDecoration: 'none' }}>← Back to search</Link>
          <div style={{ color: '#6d5a48' }}>Interactive person-centered tree. Expand parents or descendants from each person card.</div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <AuthStatus />
        </div>

        {loading ? <div>Loading tree...</div> : null}
        {!loading && error ? <div style={{ color: '#8b2d2d' }}>{error}</div> : null}
        {!loading && !error && nodes.length === 0 ? <div>No person found.</div> : null}

        {!loading && !error && nodes.length > 0 ? (
          <div style={{ height: '80vh', background: '#fffaf2', border: '1px solid #e1d4c1', borderRadius: 18, overflow: 'hidden' }}>
            <ReactFlow nodes={nodes} edges={renderedEdges} fitView nodeTypes={nodeTypes} nodesDraggable>
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

  return { props: {} };
}
