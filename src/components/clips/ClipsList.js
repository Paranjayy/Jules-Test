import React, { useState, useEffect, useRef, useCallback } from 'react';
import ClipItem from './ClipItem';

function ClipsList({ 
  activeFolderId, 
  searchTerm,
  searchScope,
  typeFilter,
  isSearchResultsView,
  onSelectionChange, 
  onRequestPaste,    
  requestFocusChange,
  isFocused, // New prop
  onStartTypeToSearch // New prop
}) {
  const [clips, setClips] = useState([]);
  const [displayedClips, setDisplayedClips] = useState([]);
  const [selectedClipIds, setSelectedClipIds] = useState([]); 
  const [lastSelectedClipId, setLastSelectedClipId] = useState(null);
  const [error, setError] = useState(null);
  const listRef = useRef(null); 

  const fetchClips = useCallback(async () => {
    setError(null);
    let fetchedData;
    try {
      if (isSearchResultsView && searchTerm && searchTerm.trim() !== '') {
        fetchedData = await window.electron.invoke('search-clips', searchTerm, searchScope, activeFolderId);
      } else {
        const folderToFetch = activeFolderId === 'inbox' ? null : activeFolderId;
        fetchedData = await window.electron.invoke('get-clips', folderToFetch);
      }

      if (Array.isArray(fetchedData)) {
        setClips(fetchedData);
      } else if (fetchedData && fetchedData.error) {
        console.error('Error fetching/searching clips from main:', fetchedData.error);
        setError(`Error: ${fetchedData.error}`);
        setClips([]);
      } else {
        console.error('Error: API did not return an array or error object', fetchedData);
        setError('Could not load clips. Unexpected response.');
        setClips([]);
      }
    } catch (err) {
      console.error('IPC Error fetching/searching clips:', err);
      setError(`Error: ${err.message}`);
      setClips([]);
    }
  }, [activeFolderId, searchTerm, searchScope, isSearchResultsView]);

  useEffect(() => {
    fetchClips();
  }, [fetchClips]);

  // Apply client-side type filtering after clips are fetched or updated
  useEffect(() => {
    if (typeFilter && typeFilter.toLowerCase() !== 'all') {
      setDisplayedClips(clips.filter(clip => 
        clip.content_type && clip.content_type.toLowerCase() === typeFilter.toLowerCase()
      ));
    } else {
      setDisplayedClips(clips);
    }
  }, [clips, typeFilter]);

  // Listener for real-time updates from main process
  useEffect(() => {
    const handleClipsUpdated = () => {
      console.log('ClipsList received clips-updated, re-fetching...');
      fetchClips(); // Re-fetch all clips based on current view/search
    };
    if (window.electron && window.electron.receive) {
      window.electron.receive('clips-updated', handleClipsUpdated);
    } else {
      console.warn('window.electron.receive is not defined. Real-time clip updates will not work.');
    }
    // Cleanup function for the listener (if preload.js supports it)
    return () => {
      // if (window.electron && window.electron.removeListener) { // Example
      //   window.electron.removeListener('clips-updated', handleClipsUpdated);
      // }
    };
  }, [fetchClips]);


  const handleSelect = (clipId, clip, isCtrlOrMetaKey, isShiftKey) => {
    let newSelectedClipIds = [...selectedClipIds];
    const currentClipList = displayedClips;

    if (isShiftKey && lastSelectedClipId && currentClipList.length > 0) {
      const lastIndex = currentClipList.findIndex(c => c.id === lastSelectedClipId);
      const currentIndex = currentClipList.findIndex(c => c.id === clipId);
      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        newSelectedClipIds = currentClipList.slice(start, end + 1).map(c => c.id);
      }
    } else if (isCtrlOrMetaKey) {
      if (newSelectedClipIds.includes(clipId)) {
        newSelectedClipIds = newSelectedClipIds.filter(id => id !== clipId);
      } else {
        newSelectedClipIds.push(clipId);
      }
    } else {
      newSelectedClipIds = [clipId];
    }

    setSelectedClipIds(newSelectedClipIds);
    setLastSelectedClipId(clipId);

    if (onSelectionChange) {
      // Determine the primary selected clip (usually the last one clicked or the single selected one)
      const primaryClipObject = newSelectedClipIds.length === 1 
        ? currentClipList.find(c => c.id === newSelectedClipIds[0]) 
        : (clipId === lastSelectedClipId ? currentClipList.find(c => c.id === clipId) : null);
      onSelectionChange(newSelectedClipIds, primaryClipObject || null);
    }
  };
  
  const handleCopy = async (clipIdToCopy) => {
    // If a specific clipId is provided (e.g. from item's copy button), use it.
    // Otherwise, use the selected clips.
    const idsToCopy = clipIdToCopy ? [clipIdToCopy] : selectedClipIds;

    if (idsToCopy.length === 0) {
        console.log('No clips selected to copy.');
        return;
    }
    
    // For now, only copy the first selected item if multiple are selected via Ctrl+C
    // Or, if a specific item's copy button was clicked.
    const id = idsToCopy[0]; 

    try {
      const result = await window.electron.invoke('copy-clip-to-system', id);
      if (result && result.success) {
        console.log('Clip copied to system clipboard:', id);
        // Optionally, re-fetch to update usage stats if displayed
        // fetchClips(); 
      } else {
        console.error('Error copying clip to system:', result ? result.error : 'Unknown error');
        setError(result ? `Error copying: ${result.error}` : 'Failed to copy clip.');
      }
    } catch (err) {
      console.error('IPC Error copying clip:', err);
      setError(`Error copying clip: ${err.message}`);
    }
  };

  const handleDelete = async () => {
    if (selectedClipIds.length === 0) return;
    // For now, delete all selected clips. Could be one or many.
    try {
      for (const id of selectedClipIds) {
        const result = await window.electron.invoke('delete-clip', id);
        if (!result || !result.success) {
          console.error('Error deleting clip:', id, result ? result.error : 'Unknown error');
          // setError might be too aggressive if one of many fails.
        }
      }
      setSelectedClipIds([]);
      setLastSelectedClipId(null);
      if (onClipSelected) onClipSelected(null);
      // Re-fetch is handled by 'clips-updated' event from main process after successful delete.
    } catch (err) {
      console.error('IPC Error deleting clips:', err);
      setError(`Error deleting clips: ${err.message}`);
    }
  };


  // Keyboard navigation and actions
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!listRef.current) return;

      // Handle navigation and actions if there are displayed clips
      if (displayedClips.length > 0) {
        const currentFocusedIndex = selectedClipIds.length > 0 
          ? displayedClips.findIndex(c => c.id === lastSelectedClipId) 
          : -1;

        if (event.key === 'ArrowDown') {
          event.preventDefault();
          const nextIndex = Math.min(displayedClips.length - 1, currentFocusedIndex + 1);
          if (nextIndex >= 0) {
              handleSelect(displayedClips[nextIndex].id, displayedClips[nextIndex], event.metaKey || event.ctrlKey, event.shiftKey);
              listRef.current.children[nextIndex]?.scrollIntoView({ block: 'nearest' });
          }
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          const prevIndex = Math.max(0, currentFocusedIndex - 1);
           if (prevIndex < displayedClips.length && prevIndex >= 0) {
              handleSelect(displayedClips[prevIndex].id, displayedClips[prevIndex], event.metaKey || event.ctrlKey, event.shiftKey);
              listRef.current.children[prevIndex]?.scrollIntoView({ block: 'nearest' });
          }
        } else if (event.key === 'ArrowLeft') {
          if (requestFocusChange) requestFocusChange('folders');
        } else if (event.key === 'ArrowRight') {
          if (requestFocusChange) requestFocusChange('metadata');
        } else if ((event.metaKey || event.ctrlKey) && event.key === 'c') {
          event.preventDefault();
          handleCopy();
        } else if (event.key === 'Delete' || event.key === 'Backspace') {
          event.preventDefault();
          handleDelete();
        } else if (event.key === 'Enter' && selectedClipIds.length === 1 && lastSelectedClipId) {
          event.preventDefault();
          if (onRequestPaste) {
            onRequestPaste(lastSelectedClipId);
          } else {
            console.warn('onRequestPaste prop not provided to ClipsList for Enter key paste.');
            handleCopy(lastSelectedClipId); 
          }
        }
      }

      // Type-to-search logic
      // Check if the key is a printable character and no modifier keys (except Shift) are pressed
      if (isFocused && 
          !event.metaKey && !event.ctrlKey && !event.altKey && 
          event.key.length === 1 && // Single character
          (event.key.match(/[a-z0-9!"#$%&'()*+,-./:;<=>?@[\\\]^_`{|}~ ]/i) || event.key === ' ')) { // Alphanumeric, symbols, space
        event.preventDefault(); // Prevent default action for the typed character
        if (onStartTypeToSearch) {
          onStartTypeToSearch(event.key);
        }
      }
    };

    const listElement = listRef.current;
    listElement.addEventListener('keydown', handleKeyDown);
    return () => listElement.removeEventListener('keydown', handleKeyDown);
  }, [
    displayedClips, selectedClipIds, lastSelectedClipId, 
    handleSelect, handleCopy, handleDelete, requestFocusChange, onRequestPaste,
    isFocused, onStartTypeToSearch // Added new dependencies
  ]);


  // Drag and Drop (basic for moving to folder)
  const handleDragStart = (e, clipId) => {
    e.dataTransfer.setData('text/plain', clipId); // Set data to be clipId
    e.dataTransfer.effectAllowed = 'move';
    // console.log('Dragging clip:', clipId);
  };


  return (
    <div className="flex-grow p-0 border-r border-gray-300 bg-white flex flex-col h-full">
      <h2 className="text-lg font-semibold p-3 border-b border-gray-200 text-gray-700">
        Clips {activeFolderId ? `(Folder: ${activeFolderId === 'inbox' ? 'Inbox' : activeFolderId})` : '(All)'}
      </h2>
      {error && <p className="p-3 text-red-500">{error}</p>}
      <div 
        ref={listRef} 
        className="flex-grow overflow-y-auto focus:outline-none"
        tabIndex={0} // Make the list itself focusable for keyboard events
      >
        {displayedClips.map(clip => (
          <ClipItem
            key={clip.id}
            clip={clip}
            isSelected={selectedClipIds.includes(clip.id)}
            onSelect={handleSelect}
            onCopy={handleCopy}
            onDragStart={handleDragStart}
            searchTerm={isSearchResultsView ? searchTerm : ''} // Pass searchTerm for highlighting
          />
        ))}
        {displayedClips.length === 0 && !error && <p className="p-3 text-gray-500">No clips found.</p>}
      </div>
    </div>
  );
}

export default ClipsList;
