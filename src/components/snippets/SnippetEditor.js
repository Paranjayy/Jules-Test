import React, { useState, useEffect, useCallback } from 'react';

function SnippetEditor({ selectedSnippet, onSave, onDelete, onPaste, requestFocusChange, isFocused }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [keyword, setKeyword] = useState('');
  const [folderId, setFolderId] = useState(null); // Or 'inbox' or 'all' if needed for selection
  const [originalSnippet, setOriginalSnippet] = useState(null);
  const [error, setError] = useState('');
  const editorContainerRef = useRef(null);
  const titleInputRef = useRef(null); // Ref for the title input

  useEffect(() => {
    if (selectedSnippet) {
      setTitle(selectedSnippet.title || '');
      setContent(selectedSnippet.content || '');
      setKeyword(selectedSnippet.keyword || '');
      setFolderId(selectedSnippet.folder_id === null ? 'inbox' : selectedSnippet.folder_id); // Handle null folder_id as 'inbox'
      setOriginalSnippet(selectedSnippet);
      setError('');
    } else {
      // Reset form if no snippet is selected (e.g., for "New Snippet" mode)
      setTitle('');
      setContent('');
      setKeyword('');
      setFolderId('inbox'); // Default to inbox or 'all'
      setOriginalSnippet(null);
      setError('');
    }
  }, [selectedSnippet]);

  const hasChanges = useCallback(() => {
    if (!originalSnippet && (title || content || keyword)) return true; // New snippet with some data
    if (!originalSnippet) return false; // New snippet, no data

    return (
      title !== originalSnippet.title ||
      content !== originalSnippet.content ||
      keyword !== (originalSnippet.keyword || '') || // Handle null keyword from DB
      (folderId === 'inbox' ? null : folderId) !== originalSnippet.folder_id
    );
  }, [title, content, keyword, folderId, originalSnippet]);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      setError('Title and Content are required.');
      return;
    }
    setError('');
    const snippetData = {
      title: title.trim(),
      content: content, // Keep original spacing for content
      folder_id: folderId === 'inbox' ? null : folderId, // Convert 'inbox' back to null for DB
      keyword: keyword.trim() || null, // Store empty as null
    };

    let success = false;
    if (originalSnippet && originalSnippet.id) { // Existing snippet
      success = await onSave(originalSnippet.id, snippetData);
    } else { // New snippet
      // This component is primarily an editor. Adding new snippets might be handled by a separate form/modal.
      // However, if it needs to support adding, the onSave prop would need to differentiate.
      // For now, assuming onSave is for updates. New snippet logic might be elsewhere.
      // If onSave can handle add: success = await onSave(null, snippetData);
      console.warn("SnippetEditor: Attempted to save a new snippet, but this is usually handled by a dedicated form.");
      setError("Cannot save new snippet from this editor directly. Use 'New Snippet' form.");
      return;
    }
    if (success) {
        // Optionally re-fetch the snippet to update originalSnippet state
        // This helps if 'snippets-updated' doesn't immediately reflect the change here
    }
  };

  const handleDelete = () => {
    if (originalSnippet && originalSnippet.id) {
      onDelete(originalSnippet.id);
    }
  };

  const handlePaste = () => {
    if (originalSnippet && originalSnippet.id) {
      onPaste(originalSnippet.id);
    }
  };
  
  useEffect(() => {
    if (isFocused && titleInputRef.current) {
        titleInputRef.current.focus();
    }
  }, [isFocused]);

  const handleKeyDown = (event) => {
    if (!isFocused) return;
    if (event.key === 'ArrowLeft') {
        if (requestFocusChange) requestFocusChange('snippetsList');
    }
    // Potentially Cmd+S to save, etc.
  };


  if (!selectedSnippet && !originalSnippet) { // Adjusted condition to allow new snippet mode if originalSnippet is also null
    return (
      <div 
        className="p-4 text-gray-500 w-full md:w-1/2 h-screen overflow-y-auto bg-gray-100 border-l border-gray-300 focus:outline-none"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        ref={editorContainerRef}
      >
        Select a snippet to edit or create a new one.
      </div>
    );
  }


  return (
    <div 
        ref={editorContainerRef}
        className="w-full md:w-1/2 h-screen overflow-y-auto bg-gray-100 border-l border-gray-300 p-4 space-y-4 focus:outline-none"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
    >
      {error && <p className="bg-red-100 text-red-700 p-2 rounded text-sm">{error}</p>}
      <div>
        <label htmlFor="snippetTitle" className="block text-sm font-medium text-gray-700 mb-1">
          Title
        </label>
        <input
          ref={titleInputRef}
          type="text"
          id="snippetTitle"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Snippet title"
        />
      </div>
      <div>
        <label htmlFor="snippetContent" className="block text-sm font-medium text-gray-700 mb-1">
          Content
        </label>
        <textarea
          id="snippetContent"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows="10"
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          placeholder="Snippet content..."
        />
      </div>
      <div>
        <label htmlFor="snippetKeyword" className="block text-sm font-medium text-gray-700 mb-1">
          Keyword (Optional)
        </label>
        <input
          type="text"
          id="snippetKeyword"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., !sig, #emailtemp"
        />
      </div>
      
      {/* Folder selection could be a dropdown populated from get-snippet-folders */}
      {/* For now, assuming folder_id is managed externally or not editable here directly */}
      {/* <p className="text-sm text-gray-600">Folder ID: {folderId || 'N/A'}</p> */}

      <div className="flex justify-between items-center mt-4">
        <div className="space-x-2">
          <button
            onClick={handleSave}
            disabled={!hasChanges()}
            className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              hasChanges()
                ? 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Save Changes
          </button>
          <button
            onClick={handlePaste}
            disabled={!originalSnippet || !originalSnippet.id}
            className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              originalSnippet && originalSnippet.id
                ? 'bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-400'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Paste
          </button>
        </div>
        {originalSnippet && originalSnippet.id && (
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 border border-red-300 hover:border-red-500 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Delete Snippet
          </button>
        )}
      </div>
    </div>
  );
}

export default SnippetEditor;
