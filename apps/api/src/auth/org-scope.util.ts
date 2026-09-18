type OrgUnitNode = {
  id: string;
  parentId: string | null;
};

/**
 * يرجع معرف الجهة نفسها مع كل الجهات التابعة لها (أي مستوى) بالاعتماد على شجرة parentId.
 */
export function collectOrgUnitWithDescendants(
  rootId: string,
  allUnits: OrgUnitNode[],
): string[] {
  const childrenByParent = new Map<string, string[]>();

  for (const unit of allUnits) {
    if (!unit.parentId) {
      continue;
    }

    const siblings = childrenByParent.get(unit.parentId) ?? [];
    siblings.push(unit.id);
    childrenByParent.set(unit.parentId, siblings);
  }

  const collected = new Set<string>([rootId]);
  const queue = [rootId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) {
      continue;
    }

    for (const childId of childrenByParent.get(currentId) ?? []) {
      if (!collected.has(childId)) {
        collected.add(childId);
        queue.push(childId);
      }
    }
  }

  return Array.from(collected);
}
