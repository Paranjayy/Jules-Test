import React, { useState, useEffect, useRef } from 'react';
import FolderItem from './FolderItem';

function FoldersList({ activeFolderId, onFolderSelect }) {
  const [folders, setFolders] = useState([]);
  const [selectedFolderIdInternal, setSelectedFolderIdInternal] = useState(activeFolderId);
  const [newFolderName, setNewFolderName] = useState('');
  const [error, setError] = useState(null);
  const listRef = useRef(null); // For keyboard navigation scrolling

  const fetchFolders = async () => {
    try {
      const fetchedFolders = await window.electron.invoke('get-folders');
      if (Array.isArray(fetchedFolders)) {
        setFolders(fetchedFolders);
        setError(null);
      } else {
        console.error('Error: get-folders did not return an array', fetchedFolders);
        setFolders([]);
        setError('Could not load folders.');
      }
    } catch (err) {
      console.error('Error fetching folders:', err);
      setError(`Error fetching folders: ${err.message}`);
      setFolders([]);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  useEffect(() => {
    setSelectedFolderIdInternal(activeFolderId);
  }, [activeFolderId]);

  const handleAddFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) {
      setError('Folder name cannot be empty.');
      return;
    }
    try {
      const result = await window.electron.invoke('add-folder', newFolderName.trim());
      if (result && result.id) {
        // setFolders([...folders, result]); // Optimistic update
        await fetchFolders(); // Re-fetch to ensure list is sorted and up-to-date
        setNewFolderName('');
        setError(null);
        onFolderSelect(result.id); // Select the newly added folder
      } else if (result && result.error) {
        setError(`Error adding folder: ${result.error}`);
      } else {
        setError('Error adding folder: Unknown error.');
      }
    } catch (err) {
      console.error('Error adding folder:', err);
      setError(`Error adding folder: ${err.message}`);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (folders.length === 0) return;

      let currentIndex = folders.findIndex(f => f.id === selectedFolderIdInternal);

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        currentIndex = Math.min(folders.length - 1, currentIndex + 1);
        onFolderSelect(folders[currentIndex].id);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        currentIndex = Math.max(0, currentIndex - 1);
        onFolderSelect(folders[currentIndex].id);
      }

      // Scroll into view
      if (listRef.current && listRef.current.children[currentIndex]) {
        listRef.current.children[currentIndex].scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    };

    // Attach to the list or a container that has focus
    const listElement = listRef.current;
    if (listElement) {
        listElement.addEventListener('keydown', handleKeyDown);
        // Set tabindex to allow focus on the list container
        listElement.setAttribute('tabindex', '0'); 
    }
    
    return () => {
      if (listElement) {
        listElement.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [folders, selectedFolderIdInternal, onFolderSelect]);


  return (
    <div className="p-2">
      <h3 className="text-lg font-semibold mb-2 text-gray-700">Folders</h3>
      <form onSubmit={handleAddFolder} className="mb-3">
        <input
          type="text"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          placeholder="New folder name"
          className="w-full p-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button type="submit" className="mt-1.5 w-full bg-blue-500 hover:bg-blue-600 text-white py-1.5 rounded-md text-sm">
          Add Folder
        </button>
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </form>
      <div ref={listRef} className="max-h-60 overflow-y-auto focus:outline-none" tabIndex="-1"> {/* Added tabIndex to allow focus for keydown */}
        {folders.map(folder => (
          <FolderItem
            key={folder.id}
            folder={folder}
            isSelected={selectedFolderIdInternal === folder.id}
            onSelect={() => onFolderSelect(folder.id)}
          />
        ))}
        {folders.length === 0 && !error && <p className="text-gray-500 text-sm">No folders yet.</p>}
      </div>
    </div>
  );
}

export default FoldersList;
