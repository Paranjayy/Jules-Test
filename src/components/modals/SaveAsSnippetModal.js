import React, { useState, useEffect } from 'react';

function SaveAsSnippetModal({ isOpen, onClose, clipToSave, onSnippetSaved }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [keyword, setKeyword] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('inbox'); // 'inbox' or actual folder ID
  const [availableFolders, setAvailableFolders] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Pre-fill form when modal opens
      if (clipToSave) {
        // Try to use clip's title, or first line of text content, or a generic title
        let suggestedTitle = clipToSave.title || '';
        if (!suggestedTitle && clipToSave.content_type === 'text' && clipToSave.data) {
          suggestedTitle = clipToSave.data.split('\n')[0].substring(0, 50);
        } else if (!suggestedTitle) {
          suggestedTitle = `Snippet from ${clipToSave.content_type}`;
        }
        setTitle(suggestedTitle);
        setContent(clipToSave.data || ''); // Assuming data is the content for text/link
      } else {
        // Reset if no clip is provided (should not happen for "Save As")
        setTitle('');
        setContent('');
      }
      setKeyword('');
      setSelectedFolderId('inbox'); // Default to inbox
      setError('');

      // Fetch snippet folders
      window.electron.invoke('get-snippet-folders')
        .then(folders => {
          if (Array.isArray(folders)) {
            setAvailableFolders(folders);
          } else if (folders && folders.error) {
            setError(`Error loading snippet folders: ${folders.error}`);
          }
        })
        .catch(err => setError(`Error loading snippet folders: ${err.message}`));
    }
  }, [isOpen, clipToSave]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim() || !content.trim()) {
      setError('Title and Content are required.');
      return;
    }

    const snippetData = {
      title: title.trim(),
      content: content, // Keep original spacing for content
      folder_id: selectedFolderId === 'inbox' ? null : selectedFolderId,
      keyword: keyword.trim() || null,
    };

    try {
      const result = await window.electron.invoke('add-snippet', snippetData);
      if (result && result.success) {
        console.log('Snippet saved successfully from modal, ID:', result.id);
        if (onSnippetSaved) onSnippetSaved(); // Callback to notify parent (e.g., to update status)
        onClose(); // Close modal
      } else {
        setError(result ? `Error saving snippet: ${result.error}` : 'Failed to save snippet.');
      }
    } catch (err) {
      console.error('IPC Error saving snippet:', err);
      setError(`Error: ${err.message}`);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg text-gray-800">
        <h2 className="text-xl font-semibold mb-4">Save as Snippet</h2>
        {error && <p className="bg-red-100 text-red-700 p-2 rounded mb-3 text-sm">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="snippetModalTitle" className="block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              type="text"
              id="snippetModalTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label htmlFor="snippetModalContent" className="block text-sm font-medium text-gray-700">
              Content
            </label>
            <textarea
              id="snippetModalContent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows="8"
              className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="snippetModalKeyword" className="block text-sm font-medium text-gray-700">
              Keyword (Optional)
            </label>
            <input
              type="text"
              id="snippetModalKeyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., !sig"
            />
          </div>
          <div>
            <label htmlFor="snippetModalFolder" className="block text-sm font-medium text-gray-700">
              Folder (Optional)
            </label>
            <select
              id="snippetModalFolder"
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              className="mt-1 w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="inbox">Inbox (No Folder)</option>
              {availableFolders.map(folder => (
                <option key={folder.id} value={folder.id}>{folder.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Save Snippet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SaveAsSnippetModal;
