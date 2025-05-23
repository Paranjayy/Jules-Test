import React, { useState, useEffect, useRef } from 'react';

const CLIP_TYPES = ["All", "Text", "Image", "Link", "File", "Color"]; // Added File and Color

function TypesFilter({ currentFilter, onFilterChange, requestFocus }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (requestFocus && buttonRef.current) {
      // For Cmd+P, we want to toggle the dropdown, not just focus the button
      setIsDropdownOpen(prev => !prev);
    }
  }, [requestFocus]);


  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef, buttonRef]);

  const handleSelectFilter = (filter) => {
    onFilterChange(filter.toLowerCase() === 'all' ? 'All' : filter); // Ensure 'All' is capitalized consistently
    setIsDropdownOpen(false);
  };

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleDropdown}
        className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        aria-haspopup="true"
        aria-expanded={isDropdownOpen}
      >
        Filter: {currentFilter}
        <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isDropdownOpen && (
        <div
          className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="options-menu"
        >
          <div className="py-1" role="none">
            {CLIP_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => handleSelectFilter(type)}
                className={`${
                  (currentFilter === type || (currentFilter === 'All' && type.toLowerCase() === 'all'))
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-700'
                } block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 hover:text-gray-900`}
                role="menuitem"
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TypesFilter;
