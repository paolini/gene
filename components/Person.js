import Link from 'next/link';
import { formatPersonNameText, renderPersonLifeDates, renderPersonName, renderPersonSex } from '../lib/personName';

const personTreeLinkStyle = {
  color: '#365f48',
  textDecoration: 'none',
  fontSize: 18,
  lineHeight: 1,
  display: 'inline-flex',
  alignItems: 'center',
  position: 'absolute',
  top: 20,
  right: 20
};

function PersonLink({ person }) {
  if (!person?.id) {
    return renderPersonName(person?.name, 'Unknown person');
  }

  return (
    <Link href={`/person/${person.id}`} style={{ color: '#7a4b2a', textDecoration: 'none' }}>
      {renderPersonName(person.name, person.id)}
    </Link>
  );
}

function PersonList({ people }) {
  if (!people || people.length === 0) {
    return 'None listed';
  }

  return people.map((person, index) => (
    <span key={person.id || `${person.name}-${index}`}>
      {index > 0 ? ', ' : ''}
      <PersonLink person={person} />
    </span>
  ));
}

function ParentsLine({ family }) {
  const parents = [family?.husband, family?.wife].filter(Boolean);
  if (parents.length === 0) {
    return family?.gedId || 'Unknown parents';
  }

  return parents.map((parent, index) => (
    <span key={parent.id || `${parent.name}-${index}`}>
      {index > 0 ? ' and ' : ''}
      <PersonLink person={parent} />
    </span>
  ));
}

export default function Person({ person }) {
  if (!person) {
    return null;
  }

  const hasMedia = Boolean(person.media?.length);

  return (
    <article style={{ background: '#fffaf2', border: '1px solid #e2d5c3', borderRadius: 20, padding: 24, boxShadow: '0 8px 24px rgba(78, 53, 32, 0.08)', position: 'relative' }}>
      <header style={{ marginBottom: 20 }}>
        <Link href={`/tree/person/${person.id}`} style={personTreeLinkStyle} aria-label="Open interactive person tree" title="Open interactive person tree">
          🌳
        </Link>
        <h3 style={{ margin: 0, fontSize: 24 }}>
          {renderPersonSex(person)}
          {renderPersonName(person.name, 'Unnamed person')}
          {renderPersonLifeDates(person)}
        </h3>
      </header>

      {hasMedia ? (
        <section style={{ float: 'left', marginRight: 20, marginBottom: 16 }}>
          <div style={{ display: 'grid', gap: 12, alignItems: 'flex-start' }}>
            {person.media.map((item, index) => (
              <a
                key={`${item.file}-${index}`}
                href={item.file}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: 'none', color: 'inherit', display: 'inline-block', maxWidth: '100%' }}
              >
                <figure style={{ margin: 0, border: '1px solid #e2d5c3', borderRadius: 16, overflow: 'hidden', background: '#f6efe3', boxShadow: '0 8px 18px rgba(78, 53, 32, 0.07)' }}>
                  <img
                    src={item.file}
                    alt={item.title || formatPersonNameText(person.name, 'Person photo')}
                    style={{ display: 'block', height: 140, width: 'auto', maxWidth: '100%', objectFit: 'contain', background: '#eadfce' }}
                  />
                  {item.title && (
                    <figcaption style={{ padding: '10px 12px', fontSize: 13, color: '#6a5948' }}>
                      {item.title}
                    </figcaption>
                  )}
                </figure>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 18 }}>
        <section>
          {person.famc?.length ? (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {person.famc.map((family) => (
                <li key={family.id} style={{ marginBottom: 10 }}>
                  <div>
                    Genitori: <ParentsLine family={family} />
                  </div>
                  <div style={{ fontSize: 13, color: '#7b6a59', marginTop: 4 }}>
                    Fratelli: <PersonList people={(family.children || []).filter((child) => child.id !== person.id)} />
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section>
          {person.fams?.length ? (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {person.fams.map((family) => (
                <li key={family.id} style={{ marginBottom: 10 }}>
                  <div>
                    Coniuge: <PersonLink person={[family.husband, family.wife].find((candidate) => candidate && candidate.id !== person.id)} />
                  </div>
                  <div style={{ fontSize: 13, color: '#7b6a59', marginTop: 4 }}>
                    {family.children?.length
                      ? <span>Children: <PersonList people={family.children} /></span>
                      : 'No children listed'}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>

      {hasMedia ? <div style={{ clear: 'both' }} /> : null}
    </article>
  );
}
