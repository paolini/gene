export const NODE_WIDTH = 250;
export const FAMILY_NODE_SIZE = 22;
export const PERSON_X_SPACING = 280;
export const PERSON_Y_SPACING = 220;
export const SPOUSE_X_OFFSET = 50;
export const FAMILY_NODE_Y_OFFSET = 55;
export const FAMILY_NODE_X_OFFSET = -8;
export const BROTHER_X_SPACING = 20;
export const PARENT_X_SPACING = 20;

export function spouseOf(family, personId) {
  return [family?.husband, family?.wife].find((candidate) => candidate && candidate.id !== personId) || null;
}

export function primaryMedia(person) {
  if (!person?.media?.length) {
    return null;
  }

  return person.media.find((item) => item.isPrimary && item.file) || person.media.find((item) => item.file) || null;
}

function buildAncestryGraph(source_node, personTree) {
  const nodes = [];
  const edges = [];
  const parents = personTree.parents || [];
  // console.log(`Total ancestry size for person ${personTree.name}:`, JSON.stringify(totalSize));
  let y = source_node.position.y - PERSON_Y_SPACING;

  // costruisce gli alberi dei genitori entrambi partendo da x=0, poi li centra rispetto al nodo sorgente
  const ancestryGraphs = [];
  for (const parent of parents) {
    // console.log('Parent', parent.name, JSON.stringify({ width, x, y }));
    const parentNode = { 
      id: parent.id, type: 'personNode', 
      position: { x: 0, y }, 
      data: { person: parent, hasTopHandle: parent?.famc?.length, hasBottomHandle: true } };
    edges.push({ id: `${source_node.id}-${parent.id}`, source: source_node.id, target: parent.id, sourceHandle: 'top-source', targetHandle: 'bottom', type: 'smoothstep' });
    const ancestryGraph = buildAncestryGraph(parentNode, parent);
    ancestryGraphs.push(ancestryGraph);
    edges.push(...ancestryGraph.edges);
  }
  const width = ancestryGraphs.reduce((sum, ag) => sum + (ag.xMax - ag.xMin), 0)
    + (parents.length - 1) * PARENT_X_SPACING;
  let  x = source_node.position.x + NODE_WIDTH/2 - width/2;
  const xMin = Math.min(source_node.position.x, x);
  const xMax = Math.max(source_node.position.x + NODE_WIDTH, x+width);
  nodes.push(source_node);
  for (const ag of ancestryGraphs) {
    const offset = x - ag.xMin;
    nodes.push(...ag.nodes.map((n) => ({ ...n, position: { x: n.position.x + offset, y: n.position.y } })));
    x += ag.xMax - ag.xMin + PARENT_X_SPACING;
  }
  return { nodes, edges, xMin, xMax };
}

function buildDescendencyGraph(sourceNode, personTree) {
  const nodes = [];
  const edges = [];
  const families = personTree.families || [];
  //console.log('Building descendency graph for person', JSON.stringify(personTree), 'with families', JSON.stringify(families), 'starting at position', JSON.stringify({ x, y }));
  let xMin = sourceNode.position.x;
  let xMax = sourceNode.position.x + NODE_WIDTH;
  for (const family of families) {
    // console.log('Processing family', JSON.stringify(family), 'of person', personTree.name, 'at position', JSON.stringify({ x, y }));
    const spouse = spouseOf(family, personTree.id);
    const spouseNode = { 
      id: spouse?.id, type: 'personNode', 
      position: { x: sourceNode.position.x + PERSON_X_SPACING + SPOUSE_X_OFFSET, y: sourceNode.position.y }, 
      data: { person: spouse, hasLeftHandle: true } };
    nodes.push(spouseNode);
    xMin = Math.min(xMin, spouseNode.position.x);
    xMax = Math.max(xMax, spouseNode.position.x + NODE_WIDTH);
    const familyNodeId = `family-${family.id}`;
    const familyNode = { 
      id: familyNodeId, type: 'familyNode', 
      position: { x: (sourceNode.position.x+NODE_WIDTH+spouseNode.position.x)/2 + FAMILY_NODE_X_OFFSET, y: sourceNode.position.y + FAMILY_NODE_Y_OFFSET }, 
      data: { family } };
    edges.push({ id: `${familyNodeId}-${sourceNode.id}`, source: familyNode.id, target: sourceNode.id, sourceHandle: 'left', targetHandle: 'right', type: 'straight' });
    edges.push({ id: `${familyNodeId}-${spouseNode.id}`, source: familyNode.id, target: spouseNode.id, sourceHandle: 'right', targetHandle: 'left', type: 'straight' });
    const children = family.children || [];
    nodes.push(familyNode);

    /*
     costruisce i grafi di discendenza dei figli, ognuno partendo da x=0
     andrà poi spostato in orizzontale opportunamente.
    */
    const childrenData = children.map((child) => {
      const childNode = { 
        id: child.id, type: 'personNode', 
        position: { x: 0, y: sourceNode.position.y + PERSON_Y_SPACING }, 
        data: { person: child, hasTopHandle: true, hasRightHandle: child.families?.length } };
      let xMin = childNode.position.x;
      let xMax = childNode.position.x + NODE_WIDTH;
      edges.push({ id: `${familyNodeId}-${child.id}`, source: familyNodeId, target: child.id, sourceHandle: 'bottom', targetHandle: 'top', type: 'smoothstep' });
      const descendencyGraph = buildDescendencyGraph(childNode, child);
      edges.push(...descendencyGraph.edges);
      const nodes = [childNode, ...descendencyGraph.nodes];
      xMin = Math.min(xMin, descendencyGraph.xMin);
      xMax = Math.max(xMax, descendencyGraph.xMax);
      return {
        childNode, nodes,
        xMin, xMax
      };
    });

    // allinea i grafi dei figli orizzontalmente in modo da centrarli rispetto al nodo famiglia

    const totalWidth = childrenData.reduce((sum, cd) => sum + (cd.xMax - cd.xMin), 0);
    let x = familyNode.position.x - (totalWidth) / 2;
    console.log('Total width of children graphs for family', family.husband.name, 'is', totalWidth, 'positioning them starting at x=', x);
    for (const cd of childrenData) {
      const offset = x - cd.xMin;
      xMin = Math.min(xMin, cd.xMin + offset);
      xMax = Math.max(xMax, cd.xMax + offset);
      nodes.push(...cd.nodes.map((n) => ({ ...n, position: { x: n.position.x + offset, y: n.position.y } })));
      x += cd.xMax - cd.xMin + BROTHER_X_SPACING;
    }
  }
  return { nodes, edges, xMin, xMax };
}

export function buildGraphModel(personTree) {
  console.log('Building graph model for person tree', personTree);
  let nodes = [];
  let edges = [];
  const source_node = { 
    id: personTree.id, position: { x: 0, y: 0 }, 
    type: 'personNode', 
    data: { 
      person: personTree, 
      hasTopHandle: true, 
      hasRightHandle: personTree.families && personTree.families.length > 0 
    } };

  nodes.push(source_node);

  const ancestryGraph = buildAncestryGraph(source_node, personTree);
  nodes.push(...ancestryGraph.nodes);
  edges.push(...ancestryGraph.edges);

  const descendencyGraph = buildDescendencyGraph(source_node, personTree);
  nodes.push(...descendencyGraph.nodes);
  edges.push(...descendencyGraph.edges);

  return { nodes, edges };
}

export async function buildElkLayout(graphNodes, edges, rootId) {
  if (!graphNodes.length) {
    return { nodes: [], edges: [] };
  }

  if (!edges.length) {
    return { nodes: graphNodes, edges: [] };
  }

  return {
    nodes: graphNodes, 
    edges: edges
  };
}
