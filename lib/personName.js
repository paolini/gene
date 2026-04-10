export function formatPersonNameText(name, fallback = 'persona sconosciuta') {
  if (!name) {
    return fallback;
  }

  const normalizedName = name.replace(/\//g, ' ').replace(/\s+/g, ' ').trim();

  return normalizedName || fallback;
}

function parseGedcomName(name) {
  if (!name) {
    return null;
  }

  const normalizedName = name.replace(/\s+/g, ' ').trim();
  const match = normalizedName.match(/^(.*?)\s*\/([^/]*)\/(.*)$/);

  if (!match) {
    return {
      givenName: normalizedName,
      surname: '',
      suffix: ''
    };
  }

  return {
    givenName: match[1].trim(),
    surname: match[2].trim(),
    suffix: match[3].trim()
  };
}

export function renderPersonName(name, fallback = 'persona sconosciuta') {
  const parsedName = parseGedcomName(name);

  if (!parsedName) {
    return fallback;
  }

  if (!parsedName.surname) {
    return formatPersonNameText(name, fallback);
  }

  return (
    <>
      {parsedName.givenName ? <span style={{ fontWeight: 400 }}>{`${parsedName.givenName} `}</span> : ''}
      <b>{parsedName.surname}</b>
      {parsedName.suffix ? <span style={{ fontWeight: 400 }}>{` ${parsedName.suffix}`}</span> : ''}
    </>
  );
}

export function renderPersonSex(person) {
  if (!person) {
    return null;
  }

  const sexSymbol = person.sex === 'M' ? '♂' : person.sex === 'F' ? '♀' : '';
  if (!sexSymbol) {
    return null;
  }

  return <span style={{ fontSize: '1em', fontWeight: 700, color: '#7b6a59', marginRight: 0 }}>{sexSymbol}</span>;
}

export function renderPersonLifeDates(person) {
  if (!person) {
    return null;
  }

  const lifeParts = [
    person.birthDate ? { key: 'birth', label: `✶ ${person.birthDate}` } : null,
    person.deathDate ? { key: 'death', label: `† ${person.deathDate}` } : null
  ].filter(Boolean);

  if (!lifeParts.length) {
    return null;
  }

  return (
    <span style={{ marginLeft: 8, display: 'inline-flex', gap: 6, verticalAlign: 'middle' }}>
      {lifeParts.map((part) => (
        <span
          key={part.key}
          style={{
            fontSize: '0.52em',
            fontWeight: 400,
            color: part.key === 'birth' ? '#365f48' : '#5f5a54',
            display: 'inline-flex',
            alignItems: 'center',
            padding: '1px 5px',
            borderRadius: 999,
            background: part.key === 'birth' ? '#e7f2ea' : '#efede9'
          }}
        >
          {part.label}
        </span>
      ))}
    </span>
  );
}