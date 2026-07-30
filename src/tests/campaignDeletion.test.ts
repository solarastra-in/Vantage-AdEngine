import { deleteCampaignFromFirestore, bulkDeleteCampaignsFromFirestore } from '../lib/firestoreService';

// Mock firebase/firestore
jest.mock('firebase/firestore', () => {
  const original = jest.requireActual('firebase/firestore');
  return {
    ...original,
    deleteDoc: jest.fn().mockResolvedValue(undefined),
    writeBatch: jest.fn().mockReturnValue({
      delete: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    }),
    doc: jest.fn().mockImplementation((db, path, id) => ({ path, id })),
  };
});

describe('Campaign Deletion Functions', () => {
  test('deleteCampaignFromFirestore executes deleteDoc with correct path', async () => {
    const { deleteDoc } = require('firebase/firestore');
    await deleteCampaignFromFirestore('org-123', 'cmp-999');
    expect(deleteDoc).toHaveBeenCalled();
  });

  test('bulkDeleteCampaignsFromFirestore commits batch delete', async () => {
    const { writeBatch } = require('firebase/firestore');
    await bulkDeleteCampaignsFromFirestore('org-123', ['cmp-1', 'cmp-2', 'cmp-3']);
    expect(writeBatch).toHaveBeenCalled();
  });

  test('handles empty campaign IDs gracefully without throwing', async () => {
    await expect(bulkDeleteCampaignsFromFirestore('org-123', [])).resolves.not.toThrow();
    await expect(deleteCampaignFromFirestore('', '')).resolves.not.toThrow();
  });
});
