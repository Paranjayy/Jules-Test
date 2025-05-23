import React, { useState, useEffect, useRef } from 'react';
import NewClipModal from './NewClipModal'; // Assuming this is in the same directory

function NewButton({ activeFolderId, onActionDone, requestFocus }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNewClipModalOpen, setIsNewClipModalOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (requestFocus && buttonRef.current) {
        // For Cmd+N, we want to toggle the dropdown, not just focus the button
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

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

  const handleNewFolder = () => {
    // This is a placeholder. In a real app, this might:
    // 1. Open an inline input in FoldersList.
    // 2. Open a dedicated small modal for folder name.
    // 3. Emit an event that App.js handles to trigger focus/input in FoldersList.
    const folderName = prompt("Enter new folder name:");
    if (folderName && folderName.trim() !== "") {
      window.electron.invoke('add-folder', folderName.trim())
        .then(result => {
          if (result && result.id) {
            if (onActionDone) onActionDone('folder'); // Notify parent
          } else {
            alert(`Error adding folder: ${result ? result.error : 'Unknown error'}`);
          }
        })
        .catch(err => alert(`Error adding folder: ${err.message}`));
    }
    setIsDropdownOpen(false);
  };

  const handleNewTag = () => {
    const tagName = prompt("Enter new tag name:");
    if (tagName && tagName.trim() !== "") {
      window.electron.invoke('add-tag', tagName.trim())
        .then(result => {
          if (result && result.id) {
            if (onActionDone) onActionDone('tag'); // Notify parent
          } else {
            alert(`Error adding tag: ${result ? result.error : 'Unknown error'}`);
          }
        })
        .catch(err => alert(`Error adding tag: ${err.message}`));
    }
    setIsDropdownOpen(false);
  };

  const handleNewClip = () => {
    setIsNewClipModalOpen(true);
    setIsDropdownOpen(false);
  };

  const handleClipAdded = () => {
    if (onActionDone) onActionDone('clip'); // Notify parent (already handled by clips-updated)
  }

  return (
    <>
      <div className="relative inline-block text-left" ref={dropdownRef}>
        <button
          ref={buttonRef}
          type="button"
          onClick={toggleDropdown}
          className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          aria-haspopup="true"
          aria-expanded={isDropdownOpen}
        >
          New
          <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {isDropdownOpen && (
          <div
            className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="new-options-menu"
          >
            <div className="py-1" role="none">
              <button onClick={handleNewFolder} className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 hover:text-gray-900" role="menuitem">
                New Folder
              </button>
              <button onClick={handleNewTag} className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 hover:text-gray-900" role="menuitem">
                New Tag
              </button>
              <button onClick={handleNewClip} className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 hover:text-gray-900" role="menuitem">
                New Clip
              </button>
            </div>
          </div>
        )}
      </div>
      <NewClipModal 
        isOpen={isNewClipModalOpen}
        onClose={() => setIsNewClipModalOpen(false)}
        activeFolderId={activeFolderId}
        onClipAdded={handleClipAdded}
      />
    </>
  );
}

export default NewButton;
