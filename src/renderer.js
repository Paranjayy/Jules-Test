import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import SinglePanelLayout from './layouts/SinglePanelLayout'; // Ensure this is used for the launcher
import ThreePanelLayout from './layouts/ThreePanelLayout';
import SnippetsViewLayout from './layouts/SnippetsViewLayout';
import ActionsPalette from './components/bottombar/ActionsPalette';
import SaveAsSnippetModal from './components/modals/SaveAsSnippetModal'; 
import ConfirmDeleteAllModal from './components/modals/ConfirmDeleteAllModal';

function App() {
  const [currentAppView, setCurrentAppView] = useState('launcher'); // 1. Initial state is 'launcher'
  const [currentPanelView, setCurrentPanelView] = useState('single'); // 1. Initial panel view is 'single' for launcher
  const [commandValue, setCommandValue] = useState('');
  const [activeFolderId, setActiveFolderId] = useState('inbox');
  const [activeTagId, setActiveTagId] = useState(null);
  const [selectedClipForMetadata, setSelectedClipForMetadata] = useState(null);
  const [focusedPanel, setFocusedPanel] = useState('folders'); 
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchScope, setSearchScope] = useState('activeFolder');
  const [typeFilter, setTypeFilter] = useState('All');
  const [isSearchResultsView, setIsSearchResultsView] = useState(false);

  const [searchBarFocusRequested, setSearchBarFocusRequested] = useState(false);
  const [typesFilterFocusRequested, setTypesFilterFocusRequested] = useState(false);
  const [newButtonFocusRequested, setNewButtonFocusRequested] = useState(false);

  const [statusMessage, setStatusMessage] = useState('Ready.');
  const [isActionsPaletteOpen, setIsActionsPaletteOpen] = useState(false);
  const [selectedClipIdsFromList, setSelectedClipIdsFromList] = useState([]);
  const [activeClipFromList, setActiveClipFromList] = useState(null); 

  const [isSaveAsSnippetModalOpen, setIsSaveAsSnippetModalOpen] = useState(false);
  const [clipToSaveAsSnippet, setClipToSaveAsSnippet] = useState(null);
  
  const [isConfirmDeleteAllModalOpen, setIsConfirmDeleteAllModalOpen] = useState(false);
  const [deleteScopeDetails, setDeleteScopeDetails] = useState({ scope: '', folderId: null, label: '' });

  // 5. Basic commandValue handler
  const handleCommandChange = (value) => {
    setCommandValue(value);
  };

  const navigateToView = (viewName) => {
    setCurrentAppView(viewName);
    if (viewName === 'launcher') { // 2. Handle 'launcher' navigation
      setCurrentPanelView('single');
      setFocusedPanel('commandInput'); // Or whatever the focus target in SinglePanelLayout will be
      setCommandValue(''); // Clear command value when navigating to launcher
    } else if (viewName === 'clipboard') {
      setCurrentPanelView('threePanel');
      setFocusedPanel('folders');
    } else if (viewName === 'snippets') {
      setFocusedPanel('snippetFolders');
    }
    setStatusMessage(`Navigated to ${viewName} view.`);
  };

  const handleFolderSelect = (folderId) => {
    setActiveFolderId(folderId || 'inbox');
    setActiveTagId(null);
    setSelectedClipForMetadata(null);
    setIsSearchResultsView(false); 
    setSearchTerm(''); 
    setFocusedPanel('clips');
    console.log("Clipboard Folder selected:", folderId || 'inbox');
  };

  const handleTagSelect = (tagId) => {
    setActiveTagId(tagId);
    setSelectedClipForMetadata(null);
    setIsSearchResultsView(false); 
    setSearchTerm('');
    setFocusedPanel('clips');
    console.log("Tag selected:", tagId);
  };
  
  const handleClipsListSelectionChange = (ids, primaryClip) => {
    setSelectedClipIdsFromList(ids);
    setActiveClipFromList(primaryClip); 
    if (ids.length === 0) {
      setStatusMessage('No clips selected.');
      setSelectedClipForMetadata(null); 
    } else if (ids.length === 1 && primaryClip) {
      setStatusMessage(`Clip "${primaryClip.title || (primaryClip.preview_text || '').substring(0,20)+'...'}" selected.`);
      setSelectedClipForMetadata(primaryClip); 
    } else {
      setStatusMessage(`${ids.length} clips selected.`);
      setSelectedClipForMetadata(null); 
    }
  };

  const handleFocusChange = (panelName) => {
    console.log("Request to change focus to panel:", panelName);
    setFocusedPanel(panelName);
    setSearchBarFocusRequested(false);
    setTypesFilterFocusRequested(false);
    setNewButtonFocusRequested(false);
  };

  const handleTopBarSearchChange = (newSearchTerm, newSearchScope) => {
    setSearchTerm(newSearchTerm);
    setSearchScope(newSearchScope);
    setIsSearchResultsView(newSearchTerm.trim() !== ''); 
    setSelectedClipForMetadata(null); 
    if (newSearchTerm.trim() !== '') {
      setFocusedPanel('search'); 
    }
  };

  const handleStartTypeToSearchInClipsList = (char) => {
    setSearchTerm(prev => prev + char); 
    setIsSearchResultsView(true);
    setFocusedPanel('search'); 
    setSearchBarFocusRequested(true); 
    setTypesFilterFocusRequested(false);
    setNewButtonFocusRequested(false);
  };

  const handleTopBarFilterChange = (newFilterType) => {
    setTypeFilter(newFilterType);
    setIsSearchResultsView(false); 
    setSelectedClipForMetadata(null);
  };
  
  const handleTopBarActionDone = (actionType) => {
    console.log(`TopBar action done: ${actionType}`);
    setStatusMessage(`New ${actionType} added.`);
  };

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
  };

  const handleOpenSaveAsSnippetModal = async () => {
    if (activeClipFromList && activeClipFromList.id) {
      const fullClipData = await window.electron.invoke('get-clip-data', activeClipFromList.id);
      if (fullClipData && !fullClipData.error) {
        setClipToSaveAsSnippet({ ...activeClipFromList, ...fullClipData });
        setIsSaveAsSnippetModalOpen(true);
        setIsActionsPaletteOpen(false); 
        setStatusMessage('Preparing to save clip as snippet...');
      } else {
        setStatusMessage(`Error fetching full clip data: ${fullClipData.error || 'Unknown error'}`);
      }
    } else {
      setStatusMessage('No active clip selected to save as snippet.');
    }
  };

  const handleCloseSaveAsSnippetModal = () => {
    setIsSaveAsSnippetModalOpen(false);
    setClipToSaveAsSnippet(null);
  };

  const handleSnippetSavedFromModal = () => {
    setStatusMessage('Clip successfully saved as snippet!');
  };

  const handleOpenDeleteAllModal = () => {
    let currentScopeDetermined = 'activeFolder'; 
    let currentFolderIdForDelete = activeFolderId; 
    let label = `clips in folder: ${activeFolderId === 'inbox' || !activeFolderId ? 'Inbox' : activeFolderId}`; 

    if (isSearchResultsView) {
      currentScopeDetermined = searchScope; 
      label = `search results in ${searchScope === 'all' ? 'All Clips' : (currentFolderIdForDelete === 'inbox' || !currentFolderIdForDelete ? 'Inbox' : `folder ${currentFolderIdForDelete}`)}`;
      if (searchScope === 'all') currentFolderIdForDelete = 'all'; 
    } else {
      if (activeFolderId === 'all') {
        currentScopeDetermined = 'allClips'; 
        label = 'All Clips (Everything!)';
      }
    }
    
    setDeleteScopeDetails({ scope: currentScopeDetermined, folderId: currentFolderIdForDelete, label });
    setIsConfirmDeleteAllModalOpen(true);
    setIsActionsPaletteOpen(false); 
  };

  const handleCloseDeleteAllModal = () => {
    setIsConfirmDeleteAllModalOpen(false);
  };

  const handleConfirmDeleteAll = async () => {
    setStatusMessage(`Deleting all clips in ${deleteScopeDetails.label}...`);
    const result = await window.electron.invoke('delete-all-clips-in-scope', deleteScopeDetails.scope, deleteScopeDetails.folderId);
    if (result && result.success) {
      setStatusMessage(`${result.affectedRows || 0} clips deleted from ${deleteScopeDetails.label}.`);
    } else {
      setStatusMessage(`Error deleting clips: ${result ? result.error : 'Unknown error'}`);
    }
    setIsConfirmDeleteAllModalOpen(false);
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
          case 'p': 
            event.preventDefault();
            setFocusedPanel('filter');
            setTypesFilterFocusRequested(true);
            setSearchBarFocusRequested(false);
            setNewButtonFocusRequested(false);
            break;
          case 'n':
            event.preventDefault();
            if (currentAppView === 'clipboard') { 
              setFocusedPanel('new');
              setNewButtonFocusRequested(true);
              setSearchBarFocusRequested(false);
              setTypesFilterFocusRequested(false);
            } else if (currentAppView === 'snippets') {
              console.log("Cmd+N in Snippets view - should trigger new snippet in SnippetsViewLayout");
            }
            break;
          case 'k': 
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

      if (event.key === 't' && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
        if (currentAppView === 'clipboard') {
          setCurrentPanelView(prev => prev === 'single' ? 'threePanel' : 'single');
        }
      }

      if (event.key === 'Escape') {
        event.preventDefault();

        if (isConfirmDeleteAllModalOpen) {
          setIsConfirmDeleteAllModalOpen(false);
          setStatusMessage('Delete all action cancelled.');
          return; // Modal was open, action taken
        }
        if (isSaveAsSnippetModalOpen) {
          setIsSaveAsSnippetModalOpen(false);
          setClipToSaveAsSnippet(null);
          setStatusMessage('Save as snippet cancelled.');
          return; // Modal was open, action taken
        }
        if (isActionsPaletteOpen) {
          setIsActionsPaletteOpen(false);
          setStatusMessage('Actions palette closed.');
          return; // Palette was open, action taken
        }

        // 4. Update Escape Key Handling for 'launcher'
        if (currentAppView === 'launcher') {
          const commandInput = document.getElementById('commandInput'); // Assuming 'commandInput' is the ID
          if (commandInput && document.activeElement === commandInput) {
            if (commandValue !== '') {
              setCommandValue('');
              setStatusMessage('Command input cleared.');
            } else {
              // If commandValue is empty and input is focused, close window
              if (window.electron && window.electron.send) {
                window.electron.send('close-window');
              }
            }
          } else if (commandValue === '') { // If input not focused but empty, also close (e.g. user clicked outside)
             if (window.electron && window.electron.send) {
                window.electron.send('close-window');
              }
          }
        } else if (currentAppView === 'clipboard' && currentPanelView === 'single') {
          // This case might need adjustment if 'single' panel is exclusively for 'launcher'
          // For now, keeping original logic if it's still reachable.
          const commandInput = document.getElementById('commandInput');
          if (commandInput && document.activeElement === commandInput && commandValue !== '') {
            setCommandValue('');
            setStatusMessage('Command input cleared.');
          } else {
            if (window.electron && window.electron.send) {
              window.electron.send('close-window');
            }
          }
        } else if (currentAppView === 'clipboard' && currentPanelView === 'threePanel') {
          if (searchTerm.trim() !== '' && focusedPanel === 'search') {
            setSearchTerm('');
            setIsSearchResultsView(false);
            setStatusMessage('Search cleared.');
          } else if (selectedClipIdsFromList.length > 0) {
            setSelectedClipIdsFromList([]);
            setActiveClipFromList(null);
            setSelectedClipForMetadata(null);
            setStatusMessage('Selection cleared.');
            setFocusedPanel('clips'); 
          } else if (searchTerm.trim() !== '') { 
            setSearchTerm('');
            setIsSearchResultsView(false);
            setStatusMessage('Search cleared.');
            setFocusedPanel('clips'); 
          } else {
            if (window.electron && window.electron.send) {
              window.electron.send('close-window');
            }
          }
        } else if (currentAppView === 'snippets') {
            console.log("Escape pressed in Snippets view. Currently no specific action beyond default (e.g. input blur).");
        }
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    commandValue, currentPanelView, isSearchResultsView, searchTerm,
    selectedClipIdsFromList, isActionsPaletteOpen, focusedPanel, currentAppView,
    isSaveAsSnippetModalOpen, isConfirmDeleteAllModalOpen, deleteScopeDetails
  ]);

  return (
    <>
      {/* 3. Update Rendering Logic */}
      {currentAppView === 'launcher' && currentPanelView === 'single' && (
        <SinglePanelLayout
          commandValue={commandValue}
          onCommandChange={handleCommandChange}
          // onCommandSubmit={handleCommandSubmit} // Optional: for future Enter key handling
        />
      )}
      {currentAppView === 'clipboard' && currentPanelView === 'threePanel' && (
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
          onStartTypeToSearch={handleStartTypeToSearchInClipsList}
          selectedClipForMetadata={selectedClipForMetadata}
          onTopBarSearchChange={handleTopBarSearchChange}
          onTopBarFilterChange={handleTopBarFilterChange}
          onTopBarActionDone={handleTopBarActionDone}
          onRequestFocusChange={handleFocusChange}
          searchBarFocusRequested={searchBarFocusRequested}
          typesFilterFocusRequested={typesFilterFocusRequested}
          newButtonFocusRequested={newButtonFocusRequested}
          focusedPanel={focusedPanel}
          statusMessage={statusMessage}
          selectedClipIdsForBottomBar={selectedClipIdsFromList}
          activeClipForBottomBar={activeClipFromList}
          onRequestPasteForBottomBar={handleRequestPasteFromBottomBar}
          onShowActionsPaletteForBottomBar={handleShowActionsPalette}
          onNavigate={navigateToView}
        />
      )}
      {currentAppView === 'snippets' && (
        <SnippetsViewLayout
          onNavigate={navigateToView}
          focusedPanel={focusedPanel}
          requestFocusChange={handleFocusChange}
        />
      )}
      {/* Modals and ActionsPalette should render regardless of the currentAppView if their states are true */}
      {isActionsPaletteOpen && (
        <ActionsPalette
          isOpen={isActionsPaletteOpen}
          onClose={handleCloseActionsPalette}
          selectedClipIds={selectedClipIdsFromList}
          activeClip={activeClipFromList}
          onActionCompleted={handleActionFromPaletteCompleted}
          onSaveAsSnippet={handleOpenSaveAsSnippetModal} 
          onDeleteAllInView={handleOpenDeleteAllModal} // Pass new handler
        />
      )}
      {isSaveAsSnippetModalOpen && clipToSaveAsSnippet && (
        <SaveAsSnippetModal
          isOpen={isSaveAsSnippetModalOpen}
          onClose={handleCloseSaveAsSnippetModal}
          clipToSave={clipToSaveAsSnippet}
          onSnippetSaved={handleSnippetSavedFromModal}
        />
      )}
      {isConfirmDeleteAllModalOpen && (
        <ConfirmDeleteAllModal
          isOpen={isConfirmDeleteAllModalOpen}
          onClose={handleCloseDeleteAllModal}
          scopeLabel={deleteScopeDetails.label}
          onConfirm={handleConfirmDeleteAll}
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
