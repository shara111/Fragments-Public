const {
  readFragment,
  writeFragment,
  readFragmentData,
  writeFragmentData,
  listFragments,
  deleteFragment,
  reset,
} = require('../../src/model/data/memory');

describe('memory fragment operations', () => {
  // Sample fragment object for testing
  const sampleFragment = {
    id: 'test-fragment-1',
    ownerId: 'user123',
    type: 'text/plain',
    size: 15,
    created: '2023-01-01T00:00:00.000Z',
    updated: '2023-01-01T00:00:00.000Z',
  };

  const sampleBuffer = Buffer.from('Hello, World!', 'utf8');

  beforeEach(() => {
    // Clear any existing data by resetting the databases
    reset();
  });

  describe('writeFragment', () => {
    test('should return a Promise', () => {
      const result = writeFragment(sampleFragment);
      expect(result).toBeInstanceOf(Promise);
    });

    test('should successfully write fragment metadata', async () => {
      await expect(writeFragment(sampleFragment)).resolves.toBeUndefined();
    });

    test('should serialize fragment as JSON', async () => {
      await writeFragment(sampleFragment);
      const retrieved = await readFragment(sampleFragment.ownerId, sampleFragment.id);
      expect(retrieved).toEqual(sampleFragment);
    });

    test('should handle different fragment types', async () => {
      const jsonFragment = { ...sampleFragment, type: 'application/json' };
      await writeFragment(jsonFragment);
      const retrieved = await readFragment(jsonFragment.ownerId, jsonFragment.id);
      expect(retrieved.type).toBe('application/json');
    });
  });

  describe('readFragment', () => {
    test('should return a Promise', () => {
      const result = readFragment('user123', 'test-id');
      expect(result).toBeInstanceOf(Promise);
    });

    test('should read fragment metadata correctly', async () => {
      await writeFragment(sampleFragment);
      const retrieved = await readFragment(sampleFragment.ownerId, sampleFragment.id);
      expect(retrieved).toEqual(sampleFragment);
    });

    test('should return undefined for non-existent fragment', async () => {
      const result = await readFragment('nonexistent', 'nonexistent');
      expect(result).toBeUndefined();
    });

    test('should parse JSON string correctly', async () => {
      await writeFragment(sampleFragment);
      const retrieved = await readFragment(sampleFragment.ownerId, sampleFragment.id);
      expect(typeof retrieved).toBe('object');
      expect(retrieved.id).toBe(sampleFragment.id);
    });
  });

  describe('writeFragmentData', () => {
    test('should return a Promise', () => {
      const result = writeFragmentData('user123', 'test-id', sampleBuffer);
      expect(result).toBeInstanceOf(Promise);
    });

    test('should successfully write fragment data', async () => {
      await expect(
        writeFragmentData(sampleFragment.ownerId, sampleFragment.id, sampleBuffer)
      ).resolves.toBeUndefined();
    });

    test('should handle Buffer data correctly', async () => {
      await writeFragmentData(sampleFragment.ownerId, sampleFragment.id, sampleBuffer);
      const retrieved = await readFragmentData(sampleFragment.ownerId, sampleFragment.id);
      expect(Buffer.isBuffer(retrieved)).toBe(true);
      expect(retrieved.toString()).toBe('Hello, World!');
    });

    test('should handle different buffer sizes', async () => {
      const largeBuffer = Buffer.alloc(1024, 'A');
      await writeFragmentData('user123', 'large-fragment', largeBuffer);
      const retrieved = await readFragmentData('user123', 'large-fragment');
      expect(retrieved.length).toBe(1024);
    });
  });

  describe('readFragmentData', () => {
    test('should return a Promise', () => {
      const result = readFragmentData('user123', 'test-id');
      expect(result).toBeInstanceOf(Promise);
    });

    test('should read fragment data correctly', async () => {
      await writeFragmentData(sampleFragment.ownerId, sampleFragment.id, sampleBuffer);
      const retrieved = await readFragmentData(sampleFragment.ownerId, sampleFragment.id);
      expect(retrieved).toEqual(sampleBuffer);
    });

    test('should return undefined for non-existent fragment data', async () => {
      const result = await readFragmentData('nonexistent', 'nonexistent');
      expect(result).toBeUndefined();
    });

    test('should preserve buffer data integrity', async () => {
      const originalBuffer = Buffer.from([1, 2, 3, 4, 5]);
      await writeFragmentData('user123', 'binary-fragment', originalBuffer);
      const retrieved = await readFragmentData('user123', 'binary-fragment');
      expect(retrieved).toEqual(originalBuffer);
    });
  });

  describe('listFragments', () => {
    test('should return a Promise', () => {
      const result = listFragments('user123');
      expect(result).toBeInstanceOf(Promise);
    });

    test('should return empty array for user with no fragments', async () => {
      const result = await listFragments('empty-user');
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([]);
    });

    test('should return fragment IDs when expand=false', async () => {
      await writeFragment(sampleFragment);
      await writeFragment({ ...sampleFragment, id: 'fragment-2' });
      
      const result = await listFragments(sampleFragment.ownerId, false);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain(sampleFragment.id);
      expect(result).toContain('fragment-2');
    });

    test('should return full fragments when expand=true', async () => {
      await writeFragment(sampleFragment);
      
      const result = await listFragments(sampleFragment.ownerId, true);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(sampleFragment);
    });

    test('should handle multiple users independently', async () => {
      const user1Fragment = { ...sampleFragment, ownerId: 'user1' };
      const user2Fragment = { ...sampleFragment, ownerId: 'user2', id: 'fragment-user2' };
      
      await writeFragment(user1Fragment);
      await writeFragment(user2Fragment);
      
      const user1Fragments = await listFragments('user1');
      const user2Fragments = await listFragments('user2');
      
      expect(user1Fragments).toContain(user1Fragment.id);
      expect(user1Fragments).not.toContain(user2Fragment.id);
      expect(user2Fragments).toContain(user2Fragment.id);
      expect(user2Fragments).not.toContain(user1Fragment.id);
    });
  });

  describe('deleteFragment', () => {
    test('should return a Promise', () => {
      // Don't actually execute the delete, just check the function returns a Promise
      const result = deleteFragment('user123', 'test-id');
      expect(result).toBeInstanceOf(Promise);
      // Since we know it will fail, catch the error to prevent test failure
      result.catch(() => {}); // Ignore the expected error
    });

    test('should delete both metadata and data', async () => {
      await writeFragment(sampleFragment);
      await writeFragmentData(sampleFragment.ownerId, sampleFragment.id, sampleBuffer);
      
      // Verify both exist
      expect(await readFragment(sampleFragment.ownerId, sampleFragment.id)).toBeDefined();
      expect(await readFragmentData(sampleFragment.ownerId, sampleFragment.id)).toBeDefined();
      
      // Delete fragment
      await expect(deleteFragment(sampleFragment.ownerId, sampleFragment.id)).resolves.toBeUndefined();
      
      // Verify both are deleted
      expect(await readFragment(sampleFragment.ownerId, sampleFragment.id)).toBeUndefined();
      expect(await readFragmentData(sampleFragment.ownerId, sampleFragment.id)).toBeUndefined();
    });

    test('should throw error when trying to delete non-existent fragment', async () => {
      await expect(deleteFragment('nonexistent', 'nonexistent')).rejects.toThrow('missing entry for primaryKey=nonexistent and secondaryKey=nonexistent');
    });

    test('should handle partial deletion gracefully', async () => {
      // Write only metadata, not data
      await writeFragment(sampleFragment);
      
      // This should still throw because data.del() will fail
      await expect(deleteFragment(sampleFragment.ownerId, sampleFragment.id)).rejects.toThrow('missing entry for primaryKey=' + sampleFragment.ownerId + ' and secondaryKey=' + sampleFragment.id);
    });
  });

  describe('integration tests', () => {
    test('should handle complete fragment lifecycle', async () => {
      // Create fragment
      await writeFragment(sampleFragment);
      await writeFragmentData(sampleFragment.ownerId, sampleFragment.id, sampleBuffer);
      
      // Verify creation
      const metadata = await readFragment(sampleFragment.ownerId, sampleFragment.id);
      const data = await readFragmentData(sampleFragment.ownerId, sampleFragment.id);
      expect(metadata).toEqual(sampleFragment);
      expect(data).toEqual(sampleBuffer);
      
      // Verify listing
      const fragments = await listFragments(sampleFragment.ownerId);
      expect(fragments).toContain(sampleFragment.id);
      
      // Delete fragment
      await deleteFragment(sampleFragment.ownerId, sampleFragment.id);
      
      // Verify deletion
      expect(await readFragment(sampleFragment.ownerId, sampleFragment.id)).toBeUndefined();
      expect(await readFragmentData(sampleFragment.ownerId, sampleFragment.id)).toBeUndefined();
    });

    test('should handle concurrent operations', async () => {
      const promises = [];
      
      // Create multiple fragments concurrently
      for (let i = 0; i < 5; i++) {
        const fragment = { ...sampleFragment, id: `fragment-${i}` };
        promises.push(writeFragment(fragment));
        promises.push(writeFragmentData(fragment.ownerId, fragment.id, sampleBuffer));
      }
      
      await Promise.all(promises);
      
      // Verify all fragments exist
      const fragments = await listFragments(sampleFragment.ownerId);
      expect(fragments).toHaveLength(5);
      
      // Verify each fragment can be read
      for (let i = 0; i < 5; i++) {
        const metadata = await readFragment(sampleFragment.ownerId, `fragment-${i}`);
        const data = await readFragmentData(sampleFragment.ownerId, `fragment-${i}`);
        expect(metadata.id).toBe(`fragment-${i}`);
        expect(data).toEqual(sampleBuffer);
      }
    });
  });
});
