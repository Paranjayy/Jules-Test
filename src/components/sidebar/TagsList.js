import React, { useState, useEffect, useRef } from 'react';
import TagItem from './TagItem';

function TagsList({ activeTagId, onTagSelect }) { // onTagSelect might not be used yet
  const [tags, setTags] = useState([]);
  const [selectedTagIdInternal, setSelectedTagIdInternal] = useState(activeTagId);
  const [newTagName, setNewTagName] = useState('');
  const [error, setError] = useState(null);
  const listRef = useRef(null);

  const fetchTags = async () => {
    try {
      const fetchedTags = await window.electron.invoke('get-tags');
      if (Array.isArray(fetchedTags)) {
        setTags(fetchedTags);
        setError(null);
      } else {
        console.error('Error: get-tags did not return an array', fetchedTags);
        setTags([]);
        setError('Could not load tags.');
      }
    } catch (err) {
      console.error('Error fetching tags:', err);
      setError(`Error fetching tags: ${err.message}`);
      setTags([]);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    setSelectedTagIdInternal(activeTagId);
  }, [activeTagId]);

  const handleAddTag = async (e) => {
    e.preventDefault();
    if (!newTagName.trim()) {
      setError('Tag name cannot be empty.');
      return;
    }
    try {
      const result = await window.electron.invoke('add-tag', newTagName.trim());
      if (result && result.id) {
        // setTags([...tags, result]); // Optimistic update
        await fetchTags(); // Re-fetch to ensure list is sorted and up-to-date
        setNewTagName('');
        setError(null);
        if (onTagSelect) onTagSelect(result.id); // Select the newly added tag if handler provided
      } else if (result && result.error) {
        setError(`Error adding tag: ${result.error}`);
      } else {
        setError('Error adding tag: Unknown error.');
      }
    } catch (err) {
      console.error('Error adding tag:', err);
      setError(`Error adding tag: ${err.message}`);
    }
  };
  
  // Basic keyboard navigation (can be enhanced)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (tags.length === 0 || !onTagSelect) return;

      let currentIndex = tags.findIndex(t => t.id === selectedTagIdInternal);

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        currentIndex = Math.min(tags.length - 1, currentIndex + 1);
        onTagSelect(tags[currentIndex].id);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        currentIndex = Math.max(0, currentIndex - 1);
        onTagSelect(tags[currentIndex].id);
      }
      
      if (listRef.current && listRef.current.children[currentIndex]) {
        listRef.current.children[currentIndex].scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    };

    const listElement = listRef.current;
    if (listElement && onTagSelect) { // Only add if onTagSelect is interactive
        listElement.addEventListener('keydown', handleKeyDown);
        listElement.setAttribute('tabindex', '0'); 
    }
    
    return () => {
      if (listElement && onTagSelect) {
        listElement.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [tags, selectedTagIdInternal, onTagSelect]);


  return (
    <div className="p-2 mt-4">
      <h3 className="text-lg font-semibold mb-2 text-gray-700">Tags</h3>
      <form onSubmit={handleAddTag} className="mb-3">
        <input
          type="text"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          placeholder="New tag name"
          className="w-full p-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button type="submit" className="mt-1.5 w-full bg-green-500 hover:bg-green-600 text-white py-1.5 rounded-md text-sm">
          Add Tag
        </button>
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </form>
      <div ref={listRef} className="max-h-40 overflow-y-auto space-y-1 focus:outline-none" tabIndex={onTagSelect ? "0" : "-1"}> {/* Conditionally focusable */}
        {tags.map(tag => (
          <TagItem
            key={tag.id}
            tag={tag}
            isSelected={selectedTagIdInternal === tag.id}
            onSelect={() => onTagSelect ? onTagSelect(tag.id) : undefined} // Only make selectable if onTagSelect is provided
          />
        ))}
        {tags.length === 0 && !error && <p className="text-gray-500 text-sm">No tags yet.</p>}
      </div>
    </div>
  );
}

export default TagsList;
