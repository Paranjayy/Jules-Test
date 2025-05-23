import React, { useState, useEffect, useRef } from 'react';

function SearchBar({ onSearch, initialSearchTerm = '', initialSearchScope = 'activeFolder', requestFocus }) {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [searchScope, setSearchScope] = useState(initialSearchScope);
  const inputRef = useRef(null);

  useEffect(() => {
    if (requestFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [requestFocus]);

  const handleSearchTermChange = (e) => {
    setSearchTerm(e.target.value);
    onSearch(e.target.value, searchScope);
  };

  const handleScopeChange = (e) => {
    setSearchScope(e.target.value);
    onSearch(searchTerm, e.target.value);
  };
  
  const handleClearSearch = () => {
    setSearchTerm('');
    onSearch('', searchScope); // Trigger search with empty term
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };


  return (
    <div className="flex items-center space-x-2 p-2 bg-gray-100 border-b border-gray-300">
      <label htmlFor="searchInput" className="sr-only">Search Clips</label>
      <div className="relative flex-grow">
        <input
          ref={inputRef}
          id="searchInput"
          type="search" // Using type="search" for potential built-in clear button
          value={searchTerm}
          onChange={handleSearchTermChange}
          placeholder="Search clips..."
          className="w-full p-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        {searchTerm && (
          <button 
            onClick={handleClearSearch}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
            aria-label="Clear search"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      <label htmlFor="searchScopeSelect" className="sr-only">Search Scope</label>
      <select
        id="searchScopeSelect"
        value={searchScope}
        onChange={handleScopeChange}
        className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
      >
        <option value="activeFolder">Active Folder</option>
        <option value="all">All Clips</option>
      </select>
    </div>
  );
}

export default SearchBar;
