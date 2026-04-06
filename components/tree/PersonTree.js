import React from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';
import { personTreeNodeTypes } from './PersonTreeNode';
import { usePersonTree } from './usePersonTree';

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

export default function PersonTree({ personId }) {
  const { loading, error, nodes, renderedEdges } = usePersonTree(personId);

  return (
    <div>
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
  );
}
