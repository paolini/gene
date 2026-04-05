import Link from 'next/link';
import { Handle, Position } from 'reactflow';
import { FAMILY_NODE_SIZE, NODE_WIDTH, primaryMedia, spouseOf } from '../../lib/personTreeLayout';
import { formatPersonNameText, renderPersonLifeDates, renderPersonName, renderPersonSex } from '../../lib/personName';

const externalButtonStyle = {
  padding: '3px 7px',
  border: 0,
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 10,
  boxShadow: '0 4px 12px rgba(78, 53, 32, 0.18)'
};

function handleStyle(isVisible, color, size, extraStyle = {}) {
  return {
    background: color,
    width: size,
    height: size,
    opacity: isVisible ? 1 : 0,
    pointerEvents: isVisible ? 'auto' : 'none',
    ...extraStyle
  };
}

function PersonTreeNode({ data }) {
  const person = data.person;
  const parentFamily = person.famc?.[0] || null;
  const showParents = data.showParentControls && parentFamily && !data.parentsExpanded;
  const families = (person.fams || []).filter((family) => !data.expandedFamilyIds?.has(family.id));
  const photo = primaryMedia(person);
  const parentLabel = [parentFamily?.husband, parentFamily?.wife].filter(Boolean).length > 0
    ? [parentFamily.husband, parentFamily.wife].filter(Boolean).map((parent) => formatPersonNameText(parent.name, parent.id)).join(' and ')
    : parentFamily?.gedId;

  return (
    <div style={{ width: NODE_WIDTH, position: 'relative', overflow: 'visible' }}>
      {showParents ? (
        <div style={{ position: 'absolute', left: '50%', top: -16, transform: 'translate(-50%, -100%)', zIndex: 2 }}>
          <button onClick={() => data.onExpandParents(person)} style={{ ...externalButtonStyle, background: '#7a4b2a', color: '#fffaf2' }}>
            Espandi genitori: {parentLabel}
          </button>
        </div>
      ) : null}

      <div style={{ width: NODE_WIDTH, background: '#fffaf2', border: '1px solid #dac8b5', borderRadius: 14, padding: 12, boxShadow: '0 8px 24px rgba(78, 53, 32, 0.08)', position: 'relative', boxSizing: 'border-box' }}>
        <Handle type="target" position={Position.Top} id="top" style={handleStyle(data.hasTopHandle, '#7a4b2a', 10)} />
        <Handle type="source" position={Position.Bottom} id="bottom" style={handleStyle(data.hasBottomHandle, '#365f48', 10)} />
        <Handle type="source" position={Position.Left} id="left" style={handleStyle(data.hasLeftHandle, '#7a4b2a', 8)} />
        <Handle type="source" position={Position.Right} id="right" style={handleStyle(data.hasRightHandle, '#7a4b2a', 8)} />

        {photo?.file ? (
          <img
            src={photo.file}
            alt={photo.title || formatPersonNameText(person?.name, 'Person photo')}
            style={{
              display: 'block',
              float: 'right',
              width: 72,
              height: 90,
              objectFit: 'cover',
              borderRadius: 10,
              border: '1px solid #dac8b5',
              background: '#eadfce',
              marginLeft: 10,
              marginBottom: 8
            }}
          />
        ) : null}

        <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.2, marginBottom: 4 }}>
          <Link href={`/person/${person.id}`} style={{ color: '#2f2419', textDecoration: 'none' }}>
            {renderPersonSex(person)}
            {renderPersonName(person?.name, person?.gedId || 'Unknown person')}
            {renderPersonLifeDates(person)}
          </Link>
        </div>

        <div style={{ fontSize: 10, color: '#7b6a59', lineHeight: 1.35 }}>
          logical: ({data.logicalLevel}, {data.logicalX})
        </div>
        <div style={{ fontSize: 10, color: '#7b6a59', lineHeight: 1.35 }}>
          rendered: ({data.renderedX ?? '-'}, {data.renderedY ?? '-'})
        </div>

        {photo?.file ? <div style={{ clear: 'both' }} /> : null}
      </div>

      {families.length ? (
        <div style={{ position: 'absolute', left: '50%', top: '100%', transform: 'translateX(-50%)', marginTop: 16, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, zIndex: 2 }}>
          {families.map((family) => {
            const spouse = spouseOf(family, person.id);

            return (
              <button
                key={family.id}
                onClick={() => data.onExpandDescendants(person, family)}
                style={{ ...externalButtonStyle, background: '#365f48', color: '#f4f0e8' }}
              >
                Espandi figli con: {formatPersonNameText(spouse?.name, spouse?.gedId || 'Unknown person')}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function FamilyTreeNode() {
  return (
    <div style={{ width: FAMILY_NODE_SIZE, height: FAMILY_NODE_SIZE, borderRadius: '50%', background: '#c59f74', border: '2px solid #7a4b2a', boxShadow: '0 6px 14px rgba(78, 53, 32, 0.12)', position: 'relative', boxSizing: 'border-box' }}>
      <Handle type="target" position={Position.Left} id="left" style={{ background: '#7a4b2a', width: 8, height: 8, left: -5 }} />
      <Handle type="target" position={Position.Right} id="right" style={{ background: '#7a4b2a', width: 8, height: 8, right: -5 }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: '#365f48', width: 8, height: 8, bottom: -5 }} />
    </div>
  );
}

export const personTreeNodeTypes = {
  personNode: PersonTreeNode,
  familyNode: FamilyTreeNode
};
