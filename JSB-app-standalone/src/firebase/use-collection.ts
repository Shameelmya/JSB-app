import { offlineDB } from '@/lib/offlineDataManager';
import { useState, useEffect } from 'react';

export function useCollection<T>(collectionName: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = offlineDB.onSnapshot<T>(collectionName, async (snapshot) => {
      try {
        setData(snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        } as T)));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [collectionName]);

  return { data, loading, error };
}
