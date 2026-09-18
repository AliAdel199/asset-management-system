import { collectOrgUnitWithDescendants } from './org-scope.util';

describe('collectOrgUnitWithDescendants', () => {
  it('returns only the root when it has no children', () => {
    const units = [
      { id: 'root', parentId: null },
      { id: 'unrelated', parentId: null },
    ];

    expect(collectOrgUnitWithDescendants('root', units)).toEqual(['root']);
  });

  it('includes direct children', () => {
    const units = [
      { id: 'root', parentId: null },
      { id: 'child-a', parentId: 'root' },
      { id: 'child-b', parentId: 'root' },
      { id: 'unrelated', parentId: null },
    ];

    const result = collectOrgUnitWithDescendants('root', units);

    expect(result).toEqual(
      expect.arrayContaining(['root', 'child-a', 'child-b']),
    );
    expect(result).toHaveLength(3);
  });

  it('includes multi-level descendants', () => {
    const units = [
      { id: 'root', parentId: null },
      { id: 'child', parentId: 'root' },
      { id: 'grandchild', parentId: 'child' },
      { id: 'great-grandchild', parentId: 'grandchild' },
    ];

    const result = collectOrgUnitWithDescendants('root', units);

    expect(result).toEqual(
      expect.arrayContaining([
        'root',
        'child',
        'grandchild',
        'great-grandchild',
      ]),
    );
    expect(result).toHaveLength(4);
  });

  it('excludes units outside the subtree', () => {
    const units = [
      { id: 'root-a', parentId: null },
      { id: 'child-of-a', parentId: 'root-a' },
      { id: 'root-b', parentId: null },
      { id: 'child-of-b', parentId: 'root-b' },
    ];

    const result = collectOrgUnitWithDescendants('root-a', units);

    expect(result).toEqual(expect.arrayContaining(['root-a', 'child-of-a']));
    expect(result).not.toContain('root-b');
    expect(result).not.toContain('child-of-b');
  });

  it('starts from a leaf (no children) and returns just itself', () => {
    const units = [
      { id: 'root', parentId: null },
      { id: 'leaf', parentId: 'root' },
    ];

    expect(collectOrgUnitWithDescendants('leaf', units)).toEqual(['leaf']);
  });
});
