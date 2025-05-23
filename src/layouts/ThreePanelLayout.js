import React from 'react';
import LeftSidebar from '../components/sidebar/LeftSidebar';
import ClipsList from '../components/clips/ClipsList';
import RightSidebar from '../components/metadata/RightSidebar';
import TopBar from '../components/topbar/TopBar'; // Import TopBar

function ThreePanelLayout({
  // Props for LeftSidebar
  activeFolderId,
  onFolderSelect,
  activeTagId,
  onTagSelect,

  // Props for ClipsList
  onClipSelectedForMetadata,
  clipsListSearchTerm,
  clipsListSearchScope,
  clipsListTypeFilter,
  clipsListIsSearchResultsView,

  // Props for RightSidebar
  selectedClipForMetadata,

  // Props for TopBar
  onTopBarSearchChange,
  onTopBarFilterChange,
  onTopBarActionDone,

  // Focus Management
  onRequestFocusChange,
  searchBarFocusRequested,
  typesFilterFocusRequested,
  newButtonFocusRequested,
  focusedPanel, 

  // Props for BottomBar
  statusMessage,
  selectedClipIdsForBottomBar, 
  activeClipForBottomBar,
  onRequestPasteForBottomBar,
  onShowActionsPaletteForBottomBar,
  
  // Navigation
  onNavigate // Added onNavigate for LeftSidebar
}) {
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <TopBar
        activeFolderId={activeFolderId}
        onSearchChange={onTopBarSearchChange}
        onFilterChange={onTopBarFilterChange}
        onActionDone={onTopBarActionDone}
        searchBarFocusRequested={searchBarFocusRequested}
        typesFilterFocusRequested={typesFilterFocusRequested}
        newButtonFocusRequested={newButtonFocusRequested}
      />
      <div className="flex flex-grow overflow-hidden"> 
        <LeftSidebar
          activeFolderId={activeFolderId}
          onFolderSelect={onFolderSelect}
          activeTagId={activeTagId}
          onTagSelect={onTagSelect}
          isFocused={focusedPanel === 'folders'} 
          onNavigate={onNavigate} // Pass onNavigate
        />
        <ClipsList
          activeFolderId={activeFolderId}
          searchTerm={clipsListSearchTerm}
          searchScope={clipsListSearchScope}
          typeFilter={clipsListTypeFilter}
          isSearchResultsView={clipsListIsSearchResultsView}
          onSelectionChange={onClipSelectedForMetadata} // Renamed in App.js, ensure consistency
          onRequestPaste={onRequestPasteForBottomBar} // Pass paste handler for Enter key
          requestFocusChange={onRequestFocusChange}
          isFocused={focusedPanel === 'clips'} // Pass isFocused
        />
        <RightSidebar
          selectedClip={selectedClipForMetadata}
          requestFocusChange={onRequestFocusChange}
          isFocused={focusedPanel === 'metadata'} // Pass isFocused
        />
      </div>
      <BottomBar 
        statusMessage={statusMessage}
        selectedClipIds={selectedClipIdsForBottomBar}
        activeClip={activeClipForBottomBar}
        onRequestPaste={onRequestPasteForBottomBar}
        onShowActionsPalette={onShowActionsPaletteForBottomBar}
      />
    </div>
  );
}

export default ThreePanelLayout;
