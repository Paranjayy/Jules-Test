import React, { useState, useEffect } from 'react';

const SUPPORTED_CONTENT_TYPES = ['text', 'link']; // Initially only text and link for manual add

function NewClipModal({ isOpen, onClose, activeFolderId, onClipAdded }) {
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState('text');
  const [clipContent, setClipContent] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Reset form when modal is opened or closed
    if (!isOpen) {
      setTitle('');
      setContentType('text');
      setClipContent('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!clipContent.trim()) {
      setError('Content cannot be empty.');
      return;
    }

    try {
      const result = await window.electron.invoke('add-manual-clip', {
        title: title.trim(),
        content_type: contentType,
        data: clipContent.trim(),
        folder_id: activeFolderId, // activeFolderId can be 'inbox', null, or a number
      });

      if (result && result.success) {
        onClipAdded(); // This should trigger a refresh in ClipsList via 'clips-updated'
        onClose();
      } else {
        setError(result ? result.error : 'Failed to add clip. Unknown error.');
      }
    } catch (err) {
      console.error('Error adding manual clip:', err);
      setError(`Error: ${err.message}`);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
        <h2 className="text-xl font-semibold mb-4">Add New Clip</h2>
        {error && <p className="bg-red-100 text-red-700 p-2 rounded mb-3 text-sm">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="clipTitle" className="block text-sm font-medium text-gray-700 mb-1">
              Title (Optional)
            </label>
            <input
              type="text"
              id="clipTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="clipContentType" className="block text-sm font-medium text-gray-700 mb-1">
              Content Type
            </label>
            <select
              id="clipContentType"
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SUPPORTED_CONTENT_TYPES.map(type => (
                <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label htmlFor="clipContent" className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <textarea
              id="clipContent"
              value={clipContent}
              onChange={(e) => setClipContent(e.target.value)}
              rows="6"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={contentType === 'link' ? 'Enter URL here' : 'Enter your text content here'}
              required
            />
          </div>

          <div className="flex justify-end space-x-3">
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
              Add Clip
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewClipModal;
