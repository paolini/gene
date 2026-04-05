export function familyNodeId(familyId) {
  return `family:${familyId}`;
}

export function findFamilyInPersonMap(personMap, familyId) {
  for (const entry of Object.values(personMap)) {
    const family = [...(entry.person.famc || []), ...(entry.person.fams || [])].find((candidate) => candidate.id === familyId);
    if (family) {
      return family;
    }
  }

  return null;
}

export function getSortedPersonEntries(personMap) {
  return Object.values(personMap).sort((left, right) => {
    if (left.level !== right.level) {
      return left.level - right.level;
    }

    if (left.x !== right.x) {
      return left.x - right.x;
    }

    return left.person.id.localeCompare(right.person.id);
  });
}

export function getExpandedFamilyIds(expandedParentFamilyIds, expandedDescFamilyIds) {
  return [...new Set([...expandedParentFamilyIds, ...expandedDescFamilyIds])];
}

export function buildSemanticTreeModel(personMap, expandedParentFamilyIds, expandedDescFamilyIds) {
  const personEntries = getSortedPersonEntries(personMap);
  const expandedFamilyIds = getExpandedFamilyIds(expandedParentFamilyIds, expandedDescFamilyIds);

  return {
    personEntries,
    expandedFamilyIds,
    families: expandedFamilyIds
      .map((familyId) => findFamilyInPersonMap(personMap, familyId))
      .filter(Boolean)
  };
}