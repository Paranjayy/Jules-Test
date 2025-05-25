// In next-frontend/components/clipboard/ClipboardLeftSidebar.js
// (Showing relevant parts to be modified or added, and context)
import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
// import { ScrollArea } from '@/components/ui/scroll-area';

export default function ClipboardLeftSidebar({ activeFolderId, onFolderSelect, activeTagId, onTagSelect }) {
  const [folders, setFolders] = useState([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [folderError, setFolderError] = useState(null);

  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const newFolderInputRef = useRef(null);

  const [focusedFolderIndex, setFocusedFolderIndex] = useState(-1);
  const folderRefs = useRef([]);

  // New state for Tags
  const [tags, setTags] = useState([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagError, setTagError] = useState(null);
  const [focusedTagIndex, setFocusedTagIndex] = useState(-1);
  const tagRefs = useRef([]);

  const fetchFolders = async () => {
    // ... (existing fetchFolders function - no change)
    if (!window.electron) {
      setFolderError("Electron API not available.");
      return;
    }
    setFoldersLoading(true);
    setFolderError(null);
    try {
      const fetchedFolders = await window.electron.invoke('get-folders');
      if (fetchedFolders && !fetchedFolders.error) {
        setFolders(fetchedFolders);
      } else if (fetchedFolders && fetchedFolders.error) {
        setFolderError(fetchedFolders.error);
        setFolders([]);
      } else {
         setFolders([]);
      }
    } catch (err) {
      console.error("Error fetching folders:", err);
      setFolderError(err.message || "An unexpected error occurred while fetching folders.");
      setFolders([]);
    } finally {
      setFoldersLoading(false);
    }
  };

  // New function to fetch tags
  const fetchTags = async () => {
    if (!window.electron) {
      setTagError("Electron API not available.");
      return;
    }
    setTagsLoading(true);
    setTagError(null);
    try {
      const fetchedTags = await window.electron.invoke('get-tags');
      if (fetchedTags && !fetchedTags.error) {
        setTags(fetchedTags);
      } else if (fetchedTags && fetchedTags.error) {
        setTagError(fetchedTags.error);
        setTags([]);
      } else {
        setTags([]);
      }
    } catch (err) {
      console.error("Error fetching tags:", err);
      setTagError(err.message || "An unexpected error occurred while fetching tags.");
      setTags([]);
    } finally {
      setTagsLoading(false);
    }
  };

  useEffect(() => {
    fetchFolders();
    fetchTags(); // Call fetchTags on mount as well
  }, []);

  // ... (useEffect for isAddingFolder - no change)
  useEffect(() => {
    if (isAddingFolder && newFolderInputRef.current) {
      newFolderInputRef.current.focus();
    }
  }, [isAddingFolder]);

  // ... (useEffect for folderRefs - no change)
   useEffect(() => {
    folderRefs.current = folderRefs.current.slice(0, folders.length);
  }, [folders]);


  // ... (useEffect for focusedFolderIndex - no change)
  useEffect(() => {
    if (focusedFolderIndex !== -1 && folderRefs.current[focusedFolderIndex]) {
      folderRefs.current[focusedFolderIndex].focus();
    }
  }, [focusedFolderIndex]);

  // New useEffect for tagRefs
  useEffect(() => {
    tagRefs.current = tagRefs.current.slice(0, tags.length);
  }, [tags]);

  // New useEffect for focusedTagIndex
  useEffect(() => {
    if (focusedTagIndex !== -1 && tagRefs.current[focusedTagIndex]) {
      tagRefs.current[focusedTagIndex].focus();
    }
  }, [focusedTagIndex]);


  // ... (handleAddNewFolder, handleNewFolderInputChange, handleNewFolderKeyDown - no change)
  const handleAddNewFolder = async () => {
    if (newFolderName.trim() === '') return;
    if (!window.electron) {
      setFolderError("Electron API not available for adding folder.");
      return;
    }
    setFoldersLoading(true); 
    setFolderError(null);
    try {
      const result = await window.electron.invoke('add-folder', newFolderName.trim());
      if (result && !result.error) { 
        await fetchFolders(); 
        setNewFolderName('');
        setIsAddingFolder(false);
      } else if (result && result.error) {
        setFolderError(result.error);
      } else {
        setFolderError("Failed to add folder for an unknown reason.");
      }
    } catch (err) {
      console.error("Error adding folder:", err);
      setFolderError(err.message || "An unexpected error occurred while adding folder.");
    }
  };
  
  const handleNewFolderInputChange = (e) => {
    setNewFolderName(e.target.value);
  };

  const handleNewFolderKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleAddNewFolder();
    } else if (e.key === 'Escape') {
      setNewFolderName('');
      setIsAddingFolder(false);
      setFolderError(null); 
    }
  };
  
  const handleFolderKeyDown = (event, folderId, index) => {
    if (event.key === 'Enter') {
      onFolderSelect && onFolderSelect(folderId);
      setFocusedFolderIndex(index); 
    }
  };

  const handleFolderListKeyDown = (event) => {
    if (folders.length === 0) return; 

    let newIndex = focusedFolderIndex;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      newIndex = focusedFolderIndex === -1 ? 0 : Math.min(focusedFolderIndex + 1, folders.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      newIndex = focusedFolderIndex === -1 ? folders.length -1 : Math.max(focusedFolderIndex - 1, 0);
    }
    setFocusedFolderIndex(newIndex);
    
    if (event.key === 'Enter' && newIndex !== -1) {
        event.preventDefault();
        if (folders[newIndex]) {
             onFolderSelect && onFolderSelect(folders[newIndex].id);
        }
    }
  };

  const handleFolderItemClick = (folderId, index) => {
    onFolderSelect && onFolderSelect(folderId);
    setFocusedFolderIndex(index);
  };

  // New handlers for Tag keyboard navigation
  const handleTagItemClick = (tagId, index) => {
    onTagSelect && onTagSelect(tagId);
    setFocusedTagIndex(index);
  };

  const handleTagListKeyDown = (event) => {
    if (tags.length === 0) return;
    let newIndex = focusedTagIndex;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      newIndex = focusedTagIndex === -1 ? 0 : Math.min(focusedTagIndex + 1, tags.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      newIndex = focusedTagIndex === -1 ? tags.length -1 : Math.max(focusedTagIndex - 1, 0);
    }
    setFocusedTagIndex(newIndex);

    if (event.key === 'Enter' && newIndex !== -1) {
      event.preventDefault();
      if (tags[newIndex]) {
        onTagSelect && onTagSelect(tags[newIndex].id);
      }
    }
  };
  
   const handleTagKeyDown = (event, tagId, index) => {
    if (event.key === 'Enter') {
      onTagSelect && onTagSelect(tagId);
      setFocusedTagIndex(index); 
    }
  };


  return (
    <div className="h-full flex flex-col p-2 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
      {/* Folders Section ... (no change to its JSX structure, only its data source and loading/error) */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2 px-2 text-slate-800 dark:text-slate-200">Folders</h2>
        {foldersLoading && !isAddingFolder && <p className="px-3 py-1.5 text-sm text-slate-500">Loading folders...</p>}
        {folderError && <p className="px-3 py-1.5 text-sm text-red-500">{folderError}</p>}
        
        {!foldersLoading && !folderError && folders.length === 0 && (
            <p className="px-3 py-1.5 text-sm text-slate-500">No folders yet.</p>
        )}

        <div 
            className="space-y-1 p-1" 
            onKeyDown={handleFolderListKeyDown} 
            role="listbox" 
            tabIndex={folders.length > 0 ? 0 : -1} 
            ref={el => { if (el && focusedFolderIndex === -1 && folders.length > 0 && !isAddingFolder) el.focus(); }}
        >
          {folders.map((folder, index) => (
            <button
              key={folder.id}
              ref={el => folderRefs.current[index] = el}
              onClick={() => handleFolderItemClick(folder.id, index)}
              onKeyDown={(e) => handleFolderKeyDown(e, folder.id, index)}
              className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors
                          ${activeFolderId === folder.id ? 'bg-blue-500 text-white dark:bg-blue-600' : ''}
                          ${focusedFolderIndex === index && activeFolderId !== folder.id ? 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-100' : ''}
                          ${focusedFolderIndex !== index && activeFolderId !== folder.id ? 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300' : ''}
                          ${focusedFolderIndex === index && activeFolderId === folder.id ? 'ring-2 ring-offset-1 ring-blue-400 dark:ring-blue-500' : ''} 
                          `}
              role="option"
              aria-selected={activeFolderId === folder.id}
              id={`folder-item-${folder.id}`}
            >
              {folder.name}
            </button>
          ))}
        </div>

        {isAddingFolder ? (
          <div className="p-1 mt-1">
            <Input
              ref={newFolderInputRef}
              type="text"
              placeholder="New folder name..."
              value={newFolderName}
              onChange={handleNewFolderInputChange}
              onKeyDown={handleNewFolderKeyDown}
              className="h-8 text-sm"
            />
            <div className="flex justify-end space-x-1 mt-1">
                <Button variant="ghost" size="sm" onClick={() => { setIsAddingFolder(false); setNewFolderName(''); setFolderError(null);}} className="h-7 text-xs px-2">Cancel</Button>
                <Button variant="default" size="sm" onClick={handleAddNewFolder} className="h-7 text-xs px-2" disabled={foldersLoading}>
                    {foldersLoading && isAddingFolder ? 'Saving...' : 'Save'}
                </Button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => { setIsAddingFolder(true); setFolderError(null); }}
            className="mt-2 w-full text-left px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-50"
            disabled={foldersLoading}
          >
            + New Folder
          </button>
        )}
      </div>


      {/* Tags Section - Updated for backend data and loading/error */}
      <div className="mt-4">
        <h2 className="text-lg font-semibold mb-2 px-2 text-slate-800 dark:text-slate-200">Tags</h2>
        {tagsLoading && <p className="px-3 py-1.5 text-sm text-slate-500">Loading tags...</p>}
        {tagError && <p className="px-3 py-1.5 text-sm text-red-500">{tagError}</p>}
        {!tagsLoading && !tagError && tags.length === 0 && (
          <p className="px-3 py-1.5 text-sm text-slate-500">No tags yet.</p>
        )}
        
        {/* <ScrollArea className="h-[calc(100%-100px)] rounded-md"> */}
        <div 
            className="space-y-1 p-1"
            onKeyDown={handleTagListKeyDown}
            role="listbox"
            tabIndex={tags.length > 0 ? 0 : -1} // Focusable if items exist
            ref={el => { if (el && focusedTagIndex === -1 && tags.length > 0) el.focus(); }} // Auto-focus list
        >
          {tags.map((tag, index) => (
            <button
              key={tag.id}
              ref={el => tagRefs.current[index] = el}
              onClick={() => handleTagItemClick(tag.id, index)}
              onKeyDown={(e) => handleTagKeyDown(e, tag.id, index)}
              className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors
                          ${activeTagId === tag.id ? 'bg-green-500 text-white dark:bg-green-600' : ''}
                          ${focusedTagIndex === index && activeTagId !== tag.id ? 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-100' : ''}
                          ${focusedTagIndex !== index && activeTagId !== tag.id ? 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300' : ''}
                          ${focusedTagIndex === index && activeTagId === tag.id ? 'ring-2 ring-offset-1 ring-green-400 dark:ring-green-500' : ''}
                          `}
              role="option"
              aria-selected={activeTagId === tag.id}
              id={`tag-item-${tag.id}`}
            >
              #{tag.name} {/* Assuming tags have a 'name' property */}
            </button>
          ))}
        </div>
        {/* </ScrollArea> */}
        {/* Placeholder for Add New Tag UI - functionality to be added later */}
        <button 
            className="mt-2 w-full text-left px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-50"
            disabled={tagsLoading} // Disable if tags are loading
        >
          + New Tag
        </button>
      </div>
    </div>
  );
}
