import { Position } from 'reactflow';
import { applyHandleVisibility, buildFallbackNodes, resolveRenderedEdges } from './personTreeReactFlow';
import { buildSemanticTreeModel, familyNodeId } from './personTreeModel';

export { buildFallbackNodes } from './personTreeReactFlow';

export const NODE_WIDTH = 250;
export const FAMILY_NODE_SIZE = 22;
export const PERSON_X_SPACING = 380;
export const PERSON_Y_SPACING = 220;
export const SPOUSE_X_OFFSET = 0.85;

const CARD_VERTICAL_PADDING = 24;
const TITLE_BLOCK_HEIGHT = 32;
const PHOTO_HEIGHT = 90;
const PHOTO_BOTTOM_MARGIN = 8;

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
  const hasPhoto = Boolean(primaryMedia(person)?.file);

  let cardHeight = CARD_VERTICAL_PADDING + TITLE_BLOCK_HEIGHT;

  if (hasPhoto) {
    cardHeight = Math.max(cardHeight, CARD_VERTICAL_PADDING + PHOTO_HEIGHT + PHOTO_BOTTOM_MARGIN);
  }

  return cardHeight;
}

export function buildGraphModel(personMap, expandedParentFamilyIds, expandedDescFamilyIds) {
  const semanticModel = buildSemanticTreeModel(personMap, expandedParentFamilyIds, expandedDescFamilyIds);
  const { personEntries, families } = semanticModel;
  const personNodes = personEntries.map((entry) => ({
    id: entry.person.id,
    type: 'personNode',
    fallbackPosition: { x: entry.x * PERSON_X_SPACING, y: entry.level * PERSON_Y_SPACING },
    width: NODE_WIDTH,
    height: estimateNodeHeight(entry.person, {
      parentsExpanded: expandedParentFamilyIds.includes(entry.person.famc?.[0]?.id),
      expandedFamilyIds: new Set(expandedDescFamilyIds)
    }),
    data: {
      person: entry.person,
      logicalLevel: entry.level,
      logicalX: entry.x,
      parentsExpanded: expandedParentFamilyIds.includes(entry.person.famc?.[0]?.id),
      expandedFamilyIds: new Set(expandedDescFamilyIds),
      showParentControls: entry.showParentControls !== false,
      hasTopHandle: expandedParentFamilyIds.includes(entry.person.famc?.[0]?.id),
      hasBottomHandle: (entry.person.fams || []).some((family) => expandedDescFamilyIds.includes(family.id)),
      hasLeftHandle: false,
      hasRightHandle: false
    }
  }));
  const personNodeById = new Map(personNodes.map((node) => [node.id, node]));

  const familyNodes = families.map((family) => ({
      id: familyNodeId(family.id),
      type: 'familyNode',
      fallbackPosition: { x: 0, y: 0 },
      width: FAMILY_NODE_SIZE,
      height: FAMILY_NODE_SIZE,
      data: { family }
    }));

  const graphEdges = [];

  for (const family of families) {
    const connectorId = familyNodeId(family.id);
    const spouseNodes = [family.husband?.id, family.wife?.id]
      .map((personId) => personId ? personNodeById.get(personId) : null)
      .filter(Boolean)
      .sort((left, right) => left.fallbackPosition.x - right.fallbackPosition.x);

    for (const [index, spouseNode] of spouseNodes.entries()) {
      const isLeftSpouse = index === 0;

      if (isLeftSpouse) {
        spouseNode.data.hasRightHandle = true;
      } else {
        spouseNode.data.hasLeftHandle = true;
      }

      graphEdges.push({
        id: `${spouseNode.id}-${connectorId}`,
        source: spouseNode.id,
        sourceHandle: isLeftSpouse ? 'right' : 'left',
        target: connectorId,
        targetHandle: isLeftSpouse ? 'left' : 'right',
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

function alignRenderedFamilyNodes(renderedNodes, edges) {
  const alignedNodes = new Map(renderedNodes.map((node) => [node.id, { ...node, position: { ...node.position } }]));

  for (const node of renderedNodes) {
    if (node.type !== 'familyNode') {
      continue;
    }

    const spouseEdges = edges.filter((edge) => edge.target === node.id);
    const spouseNodes = spouseEdges
      .map((edge) => alignedNodes.get(edge.source))
      .filter(Boolean);

    if (!spouseNodes.length) {
      continue;
    }

    const familyNode = alignedNodes.get(node.id);
    const averageCenterY = spouseNodes.reduce((sum, spouseNode) => sum + spouseNode.position.y + (spouseNode.height || 0) / 2, 0) / spouseNodes.length;

    familyNode.position.y = averageCenterY - (familyNode.height || 0) / 2;

    if (spouseNodes.length === 2) {
      const leftSpouse = spouseNodes[0].position.x <= spouseNodes[1].position.x ? spouseNodes[0] : spouseNodes[1];
      const rightSpouse = spouseNodes[0].position.x > spouseNodes[1].position.x ? spouseNodes[0] : spouseNodes[1];
      const leftCenterX = leftSpouse.position.x + (leftSpouse.width || 0);
      const rightCenterX = rightSpouse.position.x;

      familyNode.position.x = (leftCenterX + rightCenterX) / 2 - (familyNode.width || 0) / 2;
    } else if (spouseNodes.length === 1) {
      const spouseNode = spouseNodes[0];
      familyNode.position.x = spouseNode.position.x + ((spouseNode.width || 0) - (familyNode.width || 0)) / 2;
    }
  }

  return [...alignedNodes.values()];
}


function buildDeterministicRenderedNodes(graphNodes, rootId) {
  const rootNode = graphNodes.find((node) => node.id === rootId && node.type === 'personNode');
  const rootOffsetX = rootNode?.fallbackPosition.x || 0;
  const rootOffsetY = rootNode?.fallbackPosition.y || 0;

  return graphNodes.map((node) => {
    const renderedX = (node.fallbackPosition.x || 0) - rootOffsetX;
    const renderedY = (node.fallbackPosition.y || 0) - rootOffsetY;

    return {
      id: node.id,
      type: node.type,
      width: node.width,
      height: node.height,
      position: {
        x: renderedX,
        y: renderedY
      },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      data: {
        ...node.data,
        renderedX: Math.round(renderedX),
        renderedY: Math.round(renderedY)
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
  const renderedNodes = buildDeterministicRenderedNodes(graphNodes, rootId);
  const alignedRenderedNodes = alignRenderedFamilyNodes(renderedNodes, edges);
  const renderedEdges = resolveRenderedEdges(edges, alignedRenderedNodes);

  return {
    nodes: applyHandleVisibility(alignedRenderedNodes, renderedEdges),
    edges: renderedEdges
  };
}
