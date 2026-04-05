import ELK from 'elkjs/lib/elk.bundled.js';
import { Position } from 'reactflow';

const elk = new ELK();

export const NODE_WIDTH = 250;
export const FAMILY_NODE_SIZE = 22;

export function spouseOf(family, personId) {
  return [family?.husband, family?.wife].find((candidate) => candidate && candidate.id !== personId) || null;
}

export function primaryMedia(person) {
  if (!person?.media?.length) {
    return null;
  }

  return person.media.find((item) => item.isPrimary && item.file) || person.media.find((item) => item.file) || null;
}

function estimateNodeHeight(person, layoutState) {
  const showParents = Boolean(person.famc?.[0]) && !layoutState.parentsExpanded;
  const visibleFamilyCount = (person.fams || []).filter((family) => !layoutState.expandedFamilyIds.has(family.id)).length;
  const hasPhoto = Boolean(primaryMedia(person)?.file);

  return 112 + (hasPhoto ? 102 : 0) + (showParents ? 58 : 0) + (visibleFamilyCount ? visibleFamilyCount * 56 : 0);
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

export function buildGraphModel(personMap, expandedParentFamilyIds, expandedDescFamilyIds) {
  const personEntries = Object.values(personMap);
  const expandedFamilyIds = [...new Set([...expandedParentFamilyIds, ...expandedDescFamilyIds])];
  const personNodes = personEntries.map((entry) => ({
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
  }));

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

  const graphEdges = [];

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

export function buildFallbackNodes(graphNodes) {
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

    return {
      ...edge,
      sourceHandle: sourceIsLeftOfTarget ? 'right' : 'left',
      targetHandle: sourceIsLeftOfTarget ? 'left' : 'right'
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

export async function buildElkLayout(graphNodes, edges, rootId) {
  if (!graphNodes.length) {
    return { nodes: [], edges: [] };
  }

  if (!edges.length) {
    return { nodes: buildFallbackNodes(graphNodes), edges: [] };
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
  const rootNode = positionedNodes.get(rootId);
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
