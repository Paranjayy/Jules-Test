import React, { useState, useEffect, useRef } from 'react';
import SnippetFolderItem from './SnippetFolderItem';

function SnippetFoldersList({ activeFolderId, onFolderSelect, requestFocusChange, isFocused }) {
  const [folders, setFolders] = useState([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [error, setError] = useState(null);
  const listContainerRef = useRef(null); // Ref for the main container of this list

  const fetchFolders = async () => {
    setError(null);
    try {
      const fetchedFolders = await window.electron.invoke('get-snippet-folders');
      if (Array.isArray(fetchedFolders)) {
        setFolders(fetchedFolders);
      } else if (fetchedFolders && fetchedFolders.error) {
        console.error('Error fetching snippet folders from main:', fetchedFolders.error);
        setError(`Error fetching folders: ${fetchedFolders.error}`);
        setFolders([]);
      } else {
        console.error('Error: get-snippet-folders did not return an array or error object', fetchedFolders);
        setError('Could not load snippet folders. Unexpected response.');
        setFolders([]);
      }
    } catch (err) {
      console.error('IPC Error fetching snippet folders:', err);
      setError(`Error fetching folders: ${err.message}`);
      setFolders([]);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, []);
  
  // Listen for 'snippets-updated' or a more specific 'snippet-folders-updated'
  // For now, let's assume 'snippets-updated' might mean folders also changed (e.g. if a folder was auto-created with a snippet)
  // A dedicated 'snippet-folders-updated' would be better.
  useEffect(() => {
    const handleSnippetsUpdated = () => {
        // console.log('SnippetFoldersList received snippets-updated, re-fetching folders...');
        fetchFolders();
    };
    if (window.electron && window.electron.receive) {
        window.electron.receive('snippets-updated', handleSnippetsUpdated); // Re-use general snippets update signal
    }
    return () => { /* Cleanup if needed */ };
  }, []);


  const handleAddFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) {
      setError('Folder name cannot be empty.');
      return;
    }
    setError(null);
    try {
      const result = await window.electron.invoke('add-snippet-folder', newFolderName.trim());
      if (result && result.success) {
        setNewFolderName('');
        fetchFolders(); // Re-fetch to get the updated list
        if (onFolderSelect) onFolderSelect(result.id); // Select the newly added folder
      } else {
        console.error('Error adding snippet folder:', result ? result.error : 'Unknown error');
        setError(result ? `Error adding folder: ${result.error}` : 'Failed to add folder.');
      }
    } catch (err) {
      console.error('IPC Error adding snippet folder:', err);
      setError(`Error adding folder: ${err.message}`);
    }
  };

  useEffect(() => {
    if (isFocused && listContainerRef.current) {
        listContainerRef.current.focus();
    }
  }, [isFocused]);

  const handleKeyDown = (event) => {
    if (!isFocused) return;

    if (event.key === 'ArrowRight') {
        if (requestFocusChange) requestFocusChange('snippetsList'); // Assuming 'snippetsList' is the key for the middle panel
    }
    // Internal Up/Down arrow navigation for items would be handled by individual items or a wrapper if needed
    // For now, assuming basic focus on the list and tabbing / clicking into items.
  };


  return (
    <div 
        ref={listContainerRef}
        className="p-2 h-full flex flex-col focus:outline-none" 
        tabIndex={-1} // Make it programmatically focusable
        onKeyDown={handleKeyDown}
    >
      <h3 className="text-lg font-semibold mb-2 text-gray-700 px-1">Snippet Folders</h3>
      <form onSubmit={handleAddFolder} className="mb-3 px-1">
        <input
          type="text"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          placeholder="New snippet folder"
          className="w-full p-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button type="submit" className="mt-1.5 w-full bg-blue-500 hover:bg-blue-600 text-white py-1.5 rounded-md text-sm">
          Add Folder
        </button>
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </form>
      <div className="flex-grow overflow-y-auto space-y-1">
        <SnippetFolderItem
            folder={{ id: 'all', name: 'All Snippets' }}
            isSelected={activeFolderId === 'all' || !activeFolderId} // 'all' is selected if activeFolderId is 'all' or null/undefined
            onSelect={() => onFolderSelect('all')}
        />
        <SnippetFolderItem
            folder={{ id: 'inbox', name: 'Inbox (No Folder)' }}
            isSelected={activeFolderId === 'inbox'}
            onSelect={() => onFolderSelect('inbox')}
        />
        {folders.map(folder => (
          <SnippetFolderItem
            key={folder.id}
            folder={folder}
            isSelected={activeFolderId === folder.id}
            onSelect={onFolderSelect}
          />
        ))}
        {folders.length === 0 && !error && <p className="text-gray-500 text-sm px-1">No custom folders yet.</p>}
      </div>
    </div>
  );
}

export default SnippetFoldersList;
