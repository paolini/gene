import Link from 'next/link';
import { Handle, Position } from 'reactflow';
import { FAMILY_NODE_SIZE, NODE_WIDTH, primaryMedia, spouseOf } from '../../lib/personTreeLayout';
import { formatPersonNameText, renderPersonLifeDates, renderPersonName, renderPersonSex } from '../../lib/personName';

function PersonTreeNode({ data }) {
  const person = data.person;
  const parentFamily = person.famc?.[0] || null;
  const showParents = data.showParentControls && parentFamily && !data.parentsExpanded;
  const families = (person.fams || []).filter((family) => !data.expandedFamilyIds?.has(family.id));
  const photo = primaryMedia(person);

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

      {photo?.file ? (
        <div style={{ marginBottom: showParents || families.length ? 10 : 8 }}>
          <img
            src={photo.file}
            alt={photo.title || formatPersonNameText(person?.name, 'Person photo')}
            style={{ display: 'block', width: 72, height: 90, objectFit: 'cover', borderRadius: 10, border: '1px solid #dac8b5', background: '#eadfce' }}
          />
        </div>
      ) : null}

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
          {families.map((family) => {
            const spouse = spouseOf(family, person.id);

            return (
              <div key={family.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 11, color: '#6d5a48', lineHeight: 1.35, flexWrap: 'wrap' }}>
                  <span>
                    Family with <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2, color: '#2f2419' }}>{renderPersonName(spouse?.name, spouse?.gedId || 'Unknown person')}</span>
                  </span>
                  <button onClick={() => data.onExpandDescendants(person, family)} style={{ padding: '3px 7px', border: 0, borderRadius: 8, background: '#365f48', color: '#f4f0e8', cursor: 'pointer', fontSize: 10 }}>
                    Expand
                  </button>
                </div>
              </div>
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
