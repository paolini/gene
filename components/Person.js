
import Link from 'next/link';
import { formatPersonNameText, renderPersonLifeDates, renderPersonName, renderPersonSex } from '../lib/personName';

// Link a una persona
function PersonLink({ person }) {
  if (!person) return <span style={{ color: '#aaa' }}>?</span>;
  return (
    <Link href={`/person/${person.id}`} style={{ color: '#365f48', textDecoration: 'underline' }}>
      {renderPersonName(person.name, 'Persona')}
    </Link>
  );
}

// Lista di persone
function PersonList({ people }) {
  if (!people?.length) return <span style={{ color: '#aaa' }}>–</span>;
  return (
    <span>
      {people.map((p, i) => (
        <span key={p.id}>
          <PersonLink person={p} />{i < people.length - 1 ? ', ' : ''}
        </span>
      ))}
    </span>
  );
}

// Riga genitori
function ParentsLine({ family }) {
  if (!family) return <span style={{ color: '#aaa' }}>?</span>;
  return (
    <span>
      <PersonLink person={family.husband} />
      {' + '}
      <PersonLink person={family.wife} />
    </span>
  );
}

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

export default function Person({ person }) {
  if (!person) {
    return null;
  }

  const hasMedia = Boolean(person.media?.length);
  const events = person.events || {};
  const eventLabels = {
    BIRT: 'Nascita',
    DEAT: 'Morte',
    MARR: 'Matrimonio',
    DIV: 'Divorzio',
    BURI: 'Sepoltura',
    BAPM: 'Battesimo'
  };

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

        {/* Titoli principali */}
        {person.titles?.length > 0 && (
          <section>
            {false && <h4 style={{ fontSize: 18, margin: '0 0 8px 0', color: '#7a4b2a' }}>Titoli</h4>}
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 15 }}>
              {person.titles.map((title, index) => (
                <li key={index} style={{ marginBottom: 4 }}>
                  {title.title}
                  {title.date ? ` ${title.date}` : ''}
                  {title.place ? ` (${title.place})` : ''}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Eventi principali */}
        {Object.keys(events).length > 0 && (
          <section>
            <h4 style={{ fontSize: 18, margin: '0 0 8px 0', color: '#7a4b2a' }}>Eventi</h4>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 15 }}>
              {Object.entries(eventLabels).map(([key, label]) => {
                const ev = events[key];
                if (!ev || (!ev.date && !ev.place)) return null;
                return (
                  <li key={key} style={{ marginBottom: 4 }}>
                    <strong>{label}:</strong>
                    {ev.date ? ` ${ev.date}` : ''}
                    {ev.place ? ` (${ev.place})` : ''}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section>
          {person.famc?.length ? (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {person.famc.map((family) => (
                <li key={family.id}>
                  <div>
                    Genitori: <ParentsLine family={family} />
                  </div>
                  <div style={{ fontSize: 13, color: '#7b6a59' }}>
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
                <li key={family.id}>
                  <div>
                    Coniuge: <PersonLink person={[family.husband, family.wife].find((candidate) => candidate && candidate.id !== person.id)} />
                  </div>
                  <div style={{ fontSize: 13, color: '#7b6a59'}}>
                    {family.children?.length
                      ? <span>Figli: <PersonList people={family.children} /></span>
                      : 'nessun figlio elencato'}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>

      {hasMedia ? <div style={{ clear: 'both' }} /> : null}
      { false && <div>
        {JSON.stringify(person, null, 2)}
      </div>}
    </article>
  );
}
