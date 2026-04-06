import React from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';
import { personTreeNodeTypes } from './PersonTreeNode';
import { usePersonTree } from './usePersonTree';
import { buildGraphModel } from '../../lib/personTreeLayout';

export default function PersonTree({ personId }) {
  const { loading, error, personTree } = usePersonTree(personId);
  const { nodes, edges } = personTree ? buildGraphModel(personTree) : { nodes: [], edges: [] };

  return (
    <div>
      {loading ? <div>Loading tree...</div> : null}
      {!loading && error ? <div style={{ color: '#8b2d2d' }}>{error}</div> : null}
      {!loading && !error && nodes.length === 0 ? <div>No person found.</div> : null}

      {!loading && !error && nodes.length > 0 ? (
        <div style={{ height: '80vh', background: '#fffaf2', border: '1px solid #e1d4c1', borderRadius: 18, overflow: 'hidden' }}>
          <ReactFlow nodes={nodes} edges={edges} fitView nodeTypes={personTreeNodeTypes} nodesDraggable>
            <MiniMap pannable zoomable />
            <Controls />
            <Background color="#d8c4a8" gap={24} />
          </ReactFlow>
        </div>
      ) : null}
    </div>
  );
}
