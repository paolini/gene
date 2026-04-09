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
