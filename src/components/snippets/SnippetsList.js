import React, { useState, useEffect, useRef, useCallback } from 'react';
import SnippetItem from './SnippetItem';

function SnippetsList({ 
  activeFolderId, 
  onSnippetSelect, 
  searchTerm, 
  requestFocusChange, 
  isFocused,
  onRequestPasteSnippet // New prop for Enter key paste
}) {
  const [snippets, setSnippets] = useState([]);
  const [displayedSnippets, setDisplayedSnippets] = useState([]);
  const [selectedSnippet, setSelectedSnippet] = useState(null);
  const [error, setError] = useState(null);
  const listContainerRef = useRef(null);

  const fetchSnippets = useCallback(async () => {
    setError(null);
    let fetchedData;
    try {
      const folderToQuery = activeFolderId === 'all' ? 'all' : 
                            activeFolderId === 'inbox' ? null : activeFolderId;

      if (searchTerm && searchTerm.trim() !== '') {
        // Use search-snippets IPC if there's a search term
        fetchedData = await window.electron.invoke('search-snippets', searchTerm, folderToQuery);
      } else {
        // Otherwise, use get-snippets by folder
        fetchedData = await window.electron.invoke('get-snippets', folderToQuery);
      }
      
      if (Array.isArray(fetchedData)) {
        setSnippets(fetchedData);
      } else if (fetchedData && fetchedData.error) {
        console.error('Error fetching/searching snippets from main:', fetchedData.error);
        setError(`Error: ${fetchedData.error}`);
        setSnippets([]);
      } else {
        console.error('Error: API did not return an array or error object', fetchedData);
        setError('Could not load snippets. Unexpected response.');
        setSnippets([]);
      }
    } catch (err) {
      console.error('IPC Error fetching/searching snippets:', err);
      setError(`Error: ${err.message}`);
      setSnippets([]);
    }
  }, [activeFolderId, searchTerm]); // Added searchTerm to dependencies

  useEffect(() => {
    fetchSnippets();
  }, [fetchSnippets]);

  // No longer need client-side search if fetchSnippets handles it via IPC
  // useEffect(() => {
  //   if (searchTerm && searchTerm.trim() !== '') {
  //     const lowerSearchTerm = searchTerm.toLowerCase();
  //     setDisplayedSnippets(
  //       snippets.filter(snippet => 
  //         (snippet.title && snippet.title.toLowerCase().includes(lowerSearchTerm)) ||
  //         (snippet.content && snippet.content.toLowerCase().includes(lowerSearchTerm)) ||
  //         (snippet.keyword && snippet.keyword.toLowerCase().includes(lowerSearchTerm))
  //       )
  //     );
  //   } else {
  //     setDisplayedSnippets(snippets);
  //   }
  // }, [snippets, searchTerm]);

  // Display all fetched snippets directly
  useEffect(() => {
    setDisplayedSnippets(snippets);
  }, [snippets]);


  // Listener for real-time updates
  useEffect(() => {
    const handleSnippetsUpdated = () => {
      fetchSnippets();
    };
    if (window.electron && window.electron.receive) {
      window.electron.receive('snippets-updated', handleSnippetsUpdated);
    }
    return () => { /* Cleanup if needed */ };
  }, [fetchSnippets]);

  const handleSelectSnippet = (snippet) => {
    setSelectedSnippet(snippet);
    if (onSnippetSelect) {
      onSnippetSelect(snippet);
    }
  };
  
  useEffect(() => {
    if (isFocused && listContainerRef.current) {
        listContainerRef.current.focus();
        // Optionally, select the first snippet if available and none selected
        if (!selectedSnippet && displayedSnippets.length > 0) {
            // handleSelectSnippet(displayedSnippets[0]); // This might be too aggressive
        }
    }
  }, [isFocused, displayedSnippets]); // selectedSnippet removed to avoid loop

  const handleKeyDown = (event) => {
    if (!isFocused || displayedSnippets.length === 0) return;

    let currentIndex = selectedSnippet 
      ? displayedSnippets.findIndex(s => s.id === selectedSnippet.id)
      : -1;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      currentIndex = Math.min(displayedSnippets.length - 1, currentIndex + 1);
      if (currentIndex >= 0) handleSelectSnippet(displayedSnippets[currentIndex]);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      currentIndex = Math.max(0, currentIndex - 1);
      if (currentIndex >=0 && displayedSnippets[currentIndex]) handleSelectSnippet(displayedSnippets[currentIndex]);
      else if (displayedSnippets.length > 0 && currentIndex < 0) handleSelectSnippet(displayedSnippets[0]); // Select first if navigating up from none selected
    } else if (event.key === 'ArrowLeft') {
      if (requestFocusChange) requestFocusChange('snippetFolders');
    } else if (event.key === 'ArrowRight') {
      if (selectedSnippet && requestFocusChange) requestFocusChange('snippetEditor');
    } else if (event.key === 'Enter' && selectedSnippet) {
        if (onRequestPasteSnippet) {
          onRequestPasteSnippet(selectedSnippet.id);
        } else {
          console.warn("onRequestPasteSnippet prop not provided to SnippetsList.");
        }
    }
  };

  return (
    <div 
      ref={listContainerRef}
      className="flex-grow p-0 border-r border-gray-300 bg-white flex flex-col h-full focus:outline-none"
      tabIndex={-1} // Make it programmatically focusable
      onKeyDown={handleKeyDown}
    >
      <h2 className="text-lg font-semibold p-3 border-b border-gray-200 text-gray-700">
        Snippets {activeFolderId ? `(Folder: ${activeFolderId === 'inbox' ? 'Inbox' : activeFolderId === 'all' ? 'All' : activeFolderId})` : ''}
        {searchTerm && <span className="text-sm text-gray-500"> - Search: "{searchTerm}"</span>}
      </h2>
      {error && <p className="p-3 text-red-500">{error}</p>}
      <div className="flex-grow overflow-y-auto">
        {displayedSnippets.map(snippet => (
          <SnippetItem
            key={snippet.id}
            snippet={snippet}
            isSelected={selectedSnippet && selectedSnippet.id === snippet.id}
            onSelect={handleSelectSnippet}
            searchTerm={searchTerm} // Pass searchTerm for highlighting
          />
        ))}
        {displayedSnippets.length === 0 && !error && <p className="p-3 text-gray-500">No snippets found.</p>}
      </div>
    </div>
  );
}

export default SnippetsList;
