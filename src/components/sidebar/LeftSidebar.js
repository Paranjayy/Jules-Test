import React, { useState, useEffect } from 'react';
import FoldersList from './FoldersList';
import TagsList from './TagsList';

function LeftSidebar({ 
  activeFolderId, 
  onFolderSelect, 
  activeTagId, 
  onTagSelect, 
  isFocused, // Added isFocused
  requestFocusChange // Added requestFocusChange
}) {
  const [currentActiveFolder, setCurrentActiveFolder] = useState(null);
  const foldersListRef = useRef(null); // Ref for FoldersList's container or focusable element
                                     // Assuming FoldersList itself will handle internal focus.
                                     // This ref is for focusing the panel itself.
  const tagsListRef = useRef(null); // Similar for TagsList

  useEffect(() => {
    if (isFocused && foldersListRef.current) {
      // When LeftSidebar becomes focused, try to focus the FoldersList's main element
      // This assumes FoldersList's main div has tabIndex="-1" and a ref.
      // Or, if FoldersList exposes a focus method.
      // For now, let's assume FoldersList's container is the target.
      // We might need to make FoldersList more complex to focus its first item.
      // A simpler approach: focus the LeftSidebar container itself if it's made focusable.
      // For now, focusing the FoldersList component's primary div if it's made focusable.
      if (foldersListRef.current.focus) { // Check if the ref element has a focus method
          foldersListRef.current.focus();
      } else {
          // Fallback: Focus the first interactive element within FoldersList if possible,
          // or the FoldersList container div which should be made focusable.
          // This part might need refinement based on how FoldersList is structured.
          // console.log("FoldersList ref does not have focus method, or FoldersList needs internal focus handling.");
      }
    }
  }, [isFocused]);


  // This effect tries to find the folder object when activeFolderId changes
  // This is a bit inefficient if folders list is very large and changes often
  // A better approach might be to lift the entire folders array or selected folder object up to App.js
  useEffect(() => {
    if (activeFolderId) {
      window.electron.invoke('get-folders').then(folders => {
        const folder = folders.find(f => f.id === activeFolderId);
        setCurrentActiveFolder(folder);
      }).catch(err => {
        console.error("Error fetching folder details for active folder display:", err);
        setCurrentActiveFolder(null);
      });
    } else {
      setCurrentActiveFolder(null);
    }
  }, [activeFolderId]);

  // Keyboard navigation for LeftSidebar (e.g., to move to ClipsList)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isFocused) return;

      if (event.key === 'ArrowRight') {
        if (requestFocusChange) requestFocusChange('clips');
      }
      // Potentially handle Tab key to cycle between FoldersList and TagsList internally,
      // or let natural tab order work if components are structured correctly.
    };

    // Attach to a focusable container for LeftSidebar if needed, or rely on FoldersList/TagsList internal handling
    // For now, assuming FoldersList or TagsList will capture arrows when they have focus.
    // This specific keydown listener is if LeftSidebar itself needs to capture keys when it's the "active panel".
    // If FoldersList has focus, its own keydown listener will take precedence for Up/Down.
    // If LeftSidebar itself is focusable (e.g. its main div):
    const currentFoldersListRef = foldersListRef.current; // Example: if foldersListRef is the main div
    if (currentFoldersListRef) {
        currentFoldersListRef.addEventListener('keydown', handleKeyDown);
    }

    return () => {
        if (currentFoldersListRef) {
            currentFoldersListRef.removeEventListener('keydown', handleKeyDown);
        }
    };
  }, [isFocused, requestFocusChange]);


  return (
    // Making the main div of LeftSidebar focusable to catch ArrowRight
    // This might need adjustments based on which specific element within LeftSidebar should get initial focus.
    <div 
        ref={foldersListRef} // Using foldersListRef for the main container for now
        className="w-1/4 p-4 border-r border-gray-300 bg-gray-50 h-screen flex flex-col focus:outline-none" 
        tabIndex={-1} // Make it programmatically focusable
    >
      <div className="flex-grow overflow-y-auto">
        <FoldersList 
          activeFolderId={activeFolderId} 
          onFolderSelect={onFolderSelect}
          // Pass isFocused or a specific focus request to FoldersList if it needs to manage its own focus on items
          // isPanelFocused={isFocused} // Example prop
        />
        <TagsList 
          activeTagId={activeTagId} 
          onTagSelect={onTagSelect}   
          // isPanelFocused={isFocused} // Example prop
        />
      </div>
      <div className="mt-auto pt-2 border-t border-gray-200">
        {currentActiveFolder ? (
          <p className="text-sm text-gray-600">Active Folder: <span className="font-semibold">{currentActiveFolder.name}</span></p>
        ) : (
          <p className="text-sm text-gray-500">No folder selected.</p>
        )}
        {/* Placeholder for active tag if needed */}
        {/* {activeTagId && <p className="text-sm text-gray-500">Active Tag ID: {activeTagId}</p>} */}
      </div>
    </div>
  );
}

export default LeftSidebar;
