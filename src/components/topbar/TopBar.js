import React, { useState } from 'react';
import SearchBar from './SearchBar';
import TypesFilter from './TypesFilter';
import NewButton from './NewButton';

function TopBar({ 
  activeFolderId, 
  onSearchChange, // (searchTerm, searchScope) => void
  onFilterChange, // (filterType) => void
  onActionDone,   // () => void (e.g., after adding new folder/tag/clip)
  searchBarFocusRequested,
  typesFilterFocusRequested,
  newButtonFocusRequested
}) {
  
  const [currentTypeFilter, setCurrentTypeFilter] = useState('All');

  const handleSearch = (searchTerm, searchScope) => {
    onSearchChange(searchTerm, searchScope);
  };

  const handleFilter = (filterType) => {
    setCurrentTypeFilter(filterType);
    onFilterChange(filterType);
  };

  const handleGenericActionDone = (actionType) => {
    // actionType could be 'folder', 'tag', 'clip'
    // This might trigger a global refresh or specific list refreshes
    // For 'clip', 'clips-updated' is already handled by ClipsList.
    // For 'folder' or 'tag', LeftSidebar might need to refresh.
    // App.js can coordinate this via onActionDone prop.
    if (onActionDone) {
      onActionDone(actionType);
    }
  };

  return (
    <div className="p-2 bg-gray-200 border-b border-gray-300 flex items-center space-x-3 sticky top-0 z-20">
      <SearchBar 
        onSearch={handleSearch} 
        initialSearchTerm="" 
        initialSearchScope="activeFolder"
        requestFocus={searchBarFocusRequested}
      />
      <TypesFilter 
        currentFilter={currentTypeFilter} 
        onFilterChange={handleFilter}
        requestFocus={typesFilterFocusRequested}
      />
      <NewButton 
        activeFolderId={activeFolderId} 
        onActionDone={handleGenericActionDone}
        requestFocus={newButtonFocusRequested}
      />
    </div>
  );
}

export default TopBar;
