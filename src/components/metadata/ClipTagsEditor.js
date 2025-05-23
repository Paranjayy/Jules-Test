import React, { useState, useEffect, useCallback } from 'react';

function ClipTagsEditor({ clipId }) {
  const [tags, setTags] = useState([]);
  const [newTagName, setNewTagName] = useState('');
  const [error, setError] = useState(null);

  const fetchClipTags = useCallback(async () => {
    if (!clipId) {
      setTags([]);
      return;
    }
    setError(null);
    try {
      const fetchedTags = await window.electron.invoke('get-clip-tags', clipId);
      if (Array.isArray(fetchedTags)) {
        setTags(fetchedTags);
      } else if (fetchedTags && fetchedTags.error) {
        console.error('Error fetching clip tags from main:', fetchedTags.error);
        setError(`Error fetching tags: ${fetchedTags.error}`);
        setTags([]);
      } else {
        console.error('Error: get-clip-tags did not return an array or error object', fetchedTags);
        setError('Could not load tags. Unexpected response.');
        setTags([]);
      }
    } catch (err) {
      console.error('IPC Error fetching clip tags:', err);
      setError(`Error fetching tags: ${err.message}`);
      setTags([]);
    }
  }, [clipId]);

  useEffect(() => {
    fetchClipTags();
  }, [fetchClipTags]);
  
  // Also re-fetch tags if 'clips-updated' is emitted and the current clipId is still valid
  // This assumes 'clips-updated' might mean tags changed for the current clip
  useEffect(() => {
    const handleClipsUpdated = () => {
      if (clipId) { // Only refetch if there's an active clip
        // console.log('ClipTagsEditor received clips-updated, re-fetching tags for clip:', clipId);
        fetchClipTags();
      }
    };
    if (window.electron && window.electron.receive) {
        window.electron.receive('clips-updated', handleClipsUpdated);
    }
    // Cleanup would be needed if window.electron.receive returned an unregister function
    return () => {
        // if (window.electron && window.electron.removeListener) { // Hypothetical
        //     window.electron.removeListener('clips-updated', handleClipsUpdated);
        // }
    };
  }, [clipId, fetchClipTags]);


  const handleAddTag = async (e) => {
    e.preventDefault();
    if (!newTagName.trim() || !clipId) {
      setError('Tag name cannot be empty.');
      return;
    }
    setError(null);
    try {
      const result = await window.electron.invoke('add-tag-to-clip', clipId, newTagName.trim());
      if (result && result.success) {
        setNewTagName('');
        fetchClipTags(); // Re-fetch to get the updated list (including new tag if created)
      } else {
        console.error('Error adding tag to clip:', result ? result.error : 'Unknown error');
        setError(result ? `Error adding tag: ${result.error}` : 'Failed to add tag.');
      }
    } catch (err) {
      console.error('IPC Error adding tag to clip:', err);
      setError(`Error adding tag: ${err.message}`);
    }
  };

  const handleRemoveTag = async (tagIdToRemove) => {
    if (!clipId) return;
    setError(null);
    try {
      const result = await window.electron.invoke('remove-tag-from-clip', clipId, tagIdToRemove);
      if (result && result.success) {
        fetchClipTags(); // Re-fetch
      } else {
        console.error('Error removing tag from clip:', result ? result.error : 'Unknown error');
        setError(result ? `Error removing tag: ${result.error}` : 'Failed to remove tag.');
      }
    } catch (err) {
      console.error('IPC Error removing tag from clip:', err);
      setError(`Error removing tag: ${err.message}`);
    }
  };

  if (!clipId) return null; // Don't render if no clip is selected

  return (
    <div className="my-3 p-3 bg-gray-50 rounded-md">
      <h4 className="text-xs text-gray-500 uppercase mb-2">Tags</h4>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map(tag => (
          <span key={tag.id} className="bg-green-200 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center">
            {tag.name}
            <button 
              onClick={() => handleRemoveTag(tag.id)} 
              className="ml-1.5 text-green-600 hover:text-green-800 focus:outline-none"
              aria-label={`Remove tag ${tag.name}`}
            >
              &times;
            </button>
          </span>
        ))}
        {tags.length === 0 && <p className="text-xs text-gray-500">No tags yet.</p>}
      </div>
      <form onSubmit={handleAddTag} className="flex gap-2">
        <input
          type="text"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          placeholder="Add new tag..."
          className="flex-grow p-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button type="submit" className="bg-green-500 hover:bg-green-600 text-white py-1.5 px-3 rounded-md text-sm">
          Add
        </button>
      </form>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

export default ClipTagsEditor;
