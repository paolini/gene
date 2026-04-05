export function formatPersonNameText(name, fallback = 'Unknown person') {
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

export function renderPersonName(name, fallback = 'Unknown person') {
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

  const lifeParts = [person.birthDate ? `✶ ${person.birthDate}` : '', person.deathDate ? `† ${person.deathDate}` : ''].filter(Boolean);

  if (!lifeParts.length) {
    return null;
  }

  return <span style={{ fontSize: '0.7em', fontWeight: 400, color: '#7b6a59', marginLeft: 8 }}>{lifeParts.join('  ')}</span>;
}