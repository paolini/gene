import { Position } from 'reactflow';

export function buildFallbackNodes(graphNodes) {
  return graphNodes.map((node) => ({
    id: node.id,
    type: node.type,
    width: node.width,
    height: node.height,
    position: node.fallbackPosition,
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    data: node.data
  }));
}

export function resolveRenderedEdges(edges, positionedNodes) {
  return edges;
}

export function applyHandleVisibility(nodes, edges) {
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