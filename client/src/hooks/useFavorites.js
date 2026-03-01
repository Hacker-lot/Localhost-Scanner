import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for managing favorite ports and folders
 * @param {Object} options - Configuration options
 * @param {string} options.apiUrl - Base API URL (default: http://localhost:3001)
 * @returns {Object} Favorites state and methods
 */
export function useFavorites(options = {}) {
  const { apiUrl = 'http://localhost:3001' } = options;

  const [favorites, setFavorites] = useState({
    ports: [],
    folders: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch favorites from API
  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/api/favorites`);

      if (!response.ok) {
        throw new Error(`Failed to fetch favorites: ${response.status}`);
      }

      const data = await response.json();
      setFavorites({
        ports: data.ports || [],
        folders: data.folders || [],
      });
    } catch (err) {
      setError(err.message);
      console.error('Error fetching favorites:', err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  // Add a favorite port
  const addPort = useCallback(
    async (portData) => {
      setError(null);

      try {
        const response = await fetch(`${apiUrl}/api/favorites/ports`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(portData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to add port: ${response.status}`);
        }

        const newPort = await response.json();

        setFavorites((prev) => ({
          ...prev,
          ports: [...prev.ports, newPort],
        }));

        return newPort;
      } catch (err) {
        setError(err.message);
        console.error('Error adding favorite port:', err);
        throw err;
      }
    },
    [apiUrl]
  );

  // Remove a favorite port
  const removePort = useCallback(
    async (portId) => {
      setError(null);

      try {
        const response = await fetch(`${apiUrl}/api/favorites/ports/${portId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error(`Failed to remove port: ${response.status}`);
        }

        setFavorites((prev) => ({
          ...prev,
          ports: prev.ports.filter((p) => p.id !== portId && p.port !== portId),
        }));

        return true;
      } catch (err) {
        setError(err.message);
        console.error('Error removing favorite port:', err);
        throw err;
      }
    },
    [apiUrl]
  );

  // Add a favorite folder
  const addFolder = useCallback(
    async (folderData) => {
      setError(null);

      try {
        const response = await fetch(`${apiUrl}/api/favorites/folders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(folderData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to add folder: ${response.status}`);
        }

        const newFolder = await response.json();

        setFavorites((prev) => ({
          ...prev,
          folders: [...prev.folders, newFolder],
        }));

        return newFolder;
      } catch (err) {
        setError(err.message);
        console.error('Error adding favorite folder:', err);
        throw err;
      }
    },
    [apiUrl]
  );

  // Remove a favorite folder
  const removeFolder = useCallback(
    async (folderId) => {
      setError(null);

      try {
        const response = await fetch(`${apiUrl}/api/favorites/folders/${folderId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error(`Failed to remove folder: ${response.status}`);
        }

        setFavorites((prev) => ({
          ...prev,
          folders: prev.folders.filter((f) => f.id !== folderId),
        }));

        return true;
      } catch (err) {
        setError(err.message);
        console.error('Error removing favorite folder:', err);
        throw err;
      }
    },
    [apiUrl]
  );

  // Fetch favorites on mount
  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  return {
    favorites,
    ports: favorites.ports,
    folders: favorites.folders,
    loading,
    error,
    addPort,
    removePort,
    addFolder,
    removeFolder,
    refresh: fetchFavorites,
  };
}

export default useFavorites;
