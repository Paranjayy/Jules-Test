import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import SinglePanelLayout from './layouts/SinglePanelLayout';
import ThreePanelLayout from './layouts/ThreePanelLayout';
// CommandInput is used within SinglePanelLayout, so direct import here might not be needed
// import CommandInput from './components/CommandInput';

function App() {
  const [currentPanelView, setCurrentPanelView] = useState('threePanel'); // Default to threePanel for development
  const [commandValue, setCommandValue] = useState(''); // For single panel CommandInput
  const [activeFolderId, setActiveFolderId] = useState('inbox'); 
  const [activeTagId, setActiveTagId] = useState(null); 
  const [selectedClipForMetadata, setSelectedClipForMetadata] = useState(null);
  const [focusedPanel, setFocusedPanel] = useState('folders'); // 'folders', 'clips', 'metadata', 'search', 'filter', 'new'

  // State for TopBar interactions
  const [searchTerm, setSearchTerm] = useState('');
  const [searchScope, setSearchScope] = useState('activeFolder'); // 'activeFolder' or 'all'
  const [typeFilter, setTypeFilter] = useState('All'); // 'All', 'Text', 'Image', etc.
  const [isSearchResultsView, setIsSearchResultsView] = useState(false);

  // State for triggering focus on TopBar elements
  const [searchBarFocusRequested, setSearchBarFocusRequested] = useState(false);
  const [typesFilterFocusRequested, setTypesFilterFocusRequested] = useState(false);
  const [newButtonFocusRequested, setNewButtonFocusRequested] = useState(false);

  // State for BottomBar and ActionsPalette
  const [statusMessage, setStatusMessage] = useState('Ready.');
  const [isActionsPaletteOpen, setIsActionsPaletteOpen] = useState(false);
  // These will be updated by ClipsList's onSelectionChange callback
  const [selectedClipIdsFromList, setSelectedClipIdsFromList] = useState([]);
  const [activeClipFromList, setActiveClipFromList] = useState(null); 

  // Refs for focusing components (simplified example)
  // In a real app, these might be managed within the layout components themselves
  // const foldersListRef = useRef(null); // This would ideally be inside LeftSidebar
  // const clipsListRef = useRef(null);   // This would ideally be inside ClipsList component
  // const metadataPanelRef = useRef(null); // This would ideally be inside RightSidebar/MetadataPanel

  // Handler for command input changes
  const handleCommandChange = (event) => {
    setCommandValue(event.target.value);
  };

  // Basic way to toggle panel view (e.g., for testing, can be removed later)
  // For example, pressing a key or a button could toggle this.
  // This is just for demonstration and will be replaced by actual triggers.
  const handleFolderSelect = (folderId) => {
    setActiveFolderId(folderId || 'inbox');
    setActiveTagId(null);
    setSelectedClipForMetadata(null);
    setIsSearchResultsView(false); // Exit search view when folder changes
    setSearchTerm(''); // Clear search term
    setFocusedPanel('clips');
    console.log("Folder selected:", folderId || 'inbox');
  };

  const handleTagSelect = (tagId) => {
    setActiveTagId(tagId);
    setSelectedClipForMetadata(null);
    setIsSearchResultsView(false); // Exit search view
    setSearchTerm('');
    setFocusedPanel('clips');
    console.log("Tag selected:", tagId);
  };

  const handleClipSelectedForMetadata = (clip) => {
    // This function is called by ClipsList when selection changes.
    // 'clip' here is the primary selected clip object, or null if multi-select or no selection.
    setSelectedClipForMetadata(clip); 
  };
  
  const handleClipsListSelectionChange = (ids, primaryClip) => {
    setSelectedClipIdsFromList(ids);
    setActiveClipFromList(primaryClip); // primaryClip can be null
    if (ids.length === 0) {
      setStatusMessage('No clips selected.');
      setSelectedClipForMetadata(null); // Also clear metadata panel if no clips selected
    } else if (ids.length === 1 && primaryClip) {
      setStatusMessage(`Clip "${primaryClip.title || primaryClip.preview_text.substring(0,20)+'...'}" selected.`);
      setSelectedClipForMetadata(primaryClip); // Update metadata panel with the single selected clip
    } else {
      setStatusMessage(`${ids.length} clips selected.`);
      setSelectedClipForMetadata(null); // Clear metadata panel for multi-select
    }
  };


  const handleFocusChange = (panelName) => {
    console.log("Request to change focus to panel:", panelName);
    setFocusedPanel(panelName);
  };

  // TopBar Handlers
  const handleTopBarSearchChange = (newSearchTerm, newSearchScope) => {
    setSearchTerm(newSearchTerm);
    setSearchScope(newSearchScope);
    setIsSearchResultsView(newSearchTerm.trim() !== ''); 
    setSelectedClipForMetadata(null); 
    if (newSearchTerm.trim() !== '') {
      setFocusedPanel('search'); // Keep search bar focused if user is actively typing in it
    }
  };

  const handleStartTypeToSearchInClipsList = (char) => {
    setSearchTerm(prev => prev + char); // Append character, or just char if starting fresh
    setIsSearchResultsView(true);
    setFocusedPanel('search'); // This will be used to tell SearchBar to take focus
    setSearchBarFocusRequested(true); // Explicitly request SearchBar to focus
    // Clear other topbar focus requests
    setTypesFilterFocusRequested(false);
    setNewButtonFocusRequested(false);
  };

  const handleTopBarFilterChange = (newFilterType) => {
    setTypeFilter(newFilterType);
    setIsSearchResultsView(false); // Filtering implies browsing, not active search results view
    setSelectedClipForMetadata(null);
    // ClipsList will use this state to filter its current view (folder/all)
  };
  
  const handleTopBarActionDone = (actionType) => {
    // This function is called after a new item (folder, tag, clip) is created via TopBar's NewButton.
    // For new clips, ClipsList already listens to 'clips-updated'.
    // For new folders/tags, LeftSidebar's lists will re-fetch due to their own IPC calls.
    // This could be used for more complex coordination if needed, e.g., selecting the new item.
    console.log(`TopBar action done: ${actionType}`);
    if (actionType === 'folder' || actionType === 'tag') {
        // FoldersList and TagsList already re-fetch after adding.
        // No explicit action needed here unless we want to select the new item.
    }
    // If a clip was added manually, 'clips-updated' will handle the refresh.
    setStatusMessage(`New ${actionType} added.`);
  };

  // BottomBar and ActionsPalette Handlers
  const handleRequestPasteFromBottomBar = async (clipId) => {
    if (!clipId) {
      setStatusMessage('No clip selected to paste.');
      return;
    }
    setStatusMessage('Pasting...');
    const result = await window.electron.invoke('paste-clip', clipId);
    if (result && result.success) {
      setStatusMessage('Clip pasted successfully!');
    } else {
      setStatusMessage(`Error pasting clip: ${result ? result.error : 'Unknown error'}`);
    }
  };

  const handleShowActionsPalette = () => setIsActionsPaletteOpen(true);
  const handleCloseActionsPalette = () => setIsActionsPaletteOpen(false);
  
  const handleActionFromPaletteCompleted = (message) => {
    setStatusMessage(message);
    // The 'clips-updated' event sent by main process handlers (delete, pin)
    // should trigger ClipsList to refresh.
    // If an action doesn't trigger 'clips-updated' but should refresh UI,
    // you might need a more specific refresh mechanism here.
  };


  useEffect(() => {
    const handleGlobalKeyDown = (event) => {
      if (event.metaKey || event.ctrlKey) {
        switch (event.key.toLowerCase()) {
          case 'f':
            event.preventDefault();
            setFocusedPanel('search'); 
            setSearchBarFocusRequested(true); 
            setTypesFilterFocusRequested(false);
            setNewButtonFocusRequested(false);
            break;
          case 'p': // Changed from 'p' to 't' to avoid conflict with default print/toggle panel.
                    // Or ensure no other 'p' shortcut exists. For now, let's assume 'p' for TypesFilter focus
            event.preventDefault();
            setFocusedPanel('filter');
            setTypesFilterFocusRequested(true);
            setSearchBarFocusRequested(false);
            setNewButtonFocusRequested(false);
            break;
          case 'n':
            event.preventDefault();
            setFocusedPanel('new');
            setNewButtonFocusRequested(true);
            setSearchBarFocusRequested(false);
            setTypesFilterFocusRequested(false);
            break;
          case 'k': // Cmd+K for Actions Palette
            event.preventDefault();
            setIsActionsPaletteOpen(prev => !prev);
            break;
          default:
            setSearchBarFocusRequested(false);
            setTypesFilterFocusRequested(false);
            setNewButtonFocusRequested(false);
            break;
        }
      } else {
         setSearchBarFocusRequested(false);
         setTypesFilterFocusRequested(false);
         setNewButtonFocusRequested(false);
      }

      // Simple 'p' without Ctrl/Cmd to toggle panel view (dev utility)
      if (event.key === 't' && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) { 
        // Using 't' to avoid conflicts.
        setCurrentPanelView(prev => prev === 'single' ? 'threePanel' : 'single');
      }

      if (event.key === 'Escape') {
        event.preventDefault(); // Prevent default Escape behavior (like exiting fullscreen)
        
        if (isActionsPaletteOpen) {
          setIsActionsPaletteOpen(false);
          setStatusMessage('Actions palette closed.');
          // Optionally, try to return focus to where it was before opening palette,
          // or to a sensible default like ClipsList. For now, just closes.
        } else if (currentPanelView === 'single') {
          const commandInput = document.getElementById('commandInput');
          if (document.activeElement === commandInput && commandValue !== '') {
            setCommandValue('');
            setStatusMessage('Command input cleared.');
          } else {
            // Only close window if command input is empty or not focused in single panel view
            if (window.electron && window.electron.send) {
              window.electron.send('close-window');
            }
          }
        } else if (currentPanelView === 'threePanel') {
          // Check TopBar components' internal states via refs or callbacks if they don't stop propagation.
          // Assuming for now that dropdowns in TopBar (TypesFilter, NewButton) handle their own Escape
          // and stop propagation if they were open. Same for NewClipModal.

          if (searchTerm.trim() !== '' && focusedPanel === 'search') { // If search bar is focused and has text
            setSearchTerm('');
            setIsSearchResultsView(false); // Exit search results view
            setStatusMessage('Search cleared.');
            // Keep focus on search bar for new search, or move to clips list
            // setSearchBarFocusRequested(true); // To keep it focused
          } else if (selectedClipIdsFromList.length > 0) {
            setSelectedClipIdsFromList([]);
            setActiveClipFromList(null);
            setSelectedClipForMetadata(null);
            setStatusMessage('Selection cleared.');
            setFocusedPanel('clips'); // Focus clips list after clearing selection
          } else if (searchTerm.trim() !== '') { // If search term exists but search bar not focused
            setSearchTerm('');
            setIsSearchResultsView(false);
            setStatusMessage('Search cleared.');
            setFocusedPanel('clips'); 
          } else {
            // If no modals, no search text, no selection -> then close window
            // This is the final fallback for Escape in three-panel view.
            if (window.electron && window.electron.send) {
              window.electron.send('close-window');
            }
          }
        }
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    commandValue, currentPanelView, isSearchResultsView, searchTerm, 
    selectedClipIdsFromList, isActionsPaletteOpen, focusedPanel // Added focusedPanel
  ]); 


  return (
    <>
      {currentPanelView === 'single' && (
        <SinglePanelLayout
          commandValue={commandValue}
          onCommandChange={handleCommandChange}
        />
      )}
      {currentPanelView === 'threePanel' && (
        <ThreePanelLayout
          activeFolderId={activeFolderId}
          onFolderSelect={handleFolderSelect}
          activeTagId={activeTagId}
          onTagSelect={handleTagSelect}
          
          onClipSelectedForMetadata={handleClipsListSelectionChange} 
          clipsListSearchTerm={searchTerm}
          clipsListSearchScope={searchScope}
          clipsListTypeFilter={typeFilter}
          clipsListIsSearchResultsView={isSearchResultsView}
          onStartTypeToSearch={handleStartTypeToSearchInClipsList} // Pass new prop
          
          selectedClipForMetadata={selectedClipForMetadata} 
          
          onTopBarSearchChange={handleTopBarSearchChange}
          onTopBarFilterChange={handleTopBarFilterChange}
          onTopBarActionDone={handleTopBarActionDone}
          
          onRequestFocusChange={handleFocusChange}
          searchBarFocusRequested={searchBarFocusRequested}
          typesFilterFocusRequested={typesFilterFocusRequested}
          newButtonFocusRequested={newButtonFocusRequested}

          // BottomBar props
          statusMessage={statusMessage}
          selectedClipIdsForBottomBar={selectedClipIdsFromList}
          activeClipForBottomBar={activeClipFromList}
          onRequestPasteForBottomBar={handleRequestPasteFromBottomBar}
          onShowActionsPaletteForBottomBar={handleShowActionsPalette}
        />
      )}
      {isActionsPaletteOpen && (
        <ActionsPalette
          isOpen={isActionsPaletteOpen}
          onClose={handleCloseActionsPalette}
          selectedClipIds={selectedClipIdsFromList}
          activeClip={activeClipFromList}
          onActionCompleted={handleActionFromPaletteCompleted}
        />
      )}
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
