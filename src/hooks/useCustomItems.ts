import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';

/**
 * Custom hook to fetch customItems from IndexedDB
 * Provides a single cached query point used across multiple components
 * 
 * Usage:
 * const customItems = useCustomItems();
 */
export const useCustomItems = () => {
  return useLiveQuery(() => db.customItems.toArray()) || [];
};
