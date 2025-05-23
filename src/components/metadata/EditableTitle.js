import React, { useState, useEffect } from 'react';

function EditableTitle({ clipId, initialTitle }) {
  const [title, setTitle] = useState(initialTitle);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = React.useRef(null);

  useEffect(() => {
    setTitle(initialTitle); // Update title when the clip changes
  }, [initialTitle]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select(); // Select text on focus
    }
  }, [isEditing]);

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  const saveTitle = async () => {
    if (!clipId) return;
    setIsEditing(false);
    if (title.trim() === initialTitle.trim()) { // No actual change
        setTitle(initialTitle); // Reset to original if only whitespace changed to match original
        return;
    }
    try {
      const result = await window.electron.invoke('update-clip-title', clipId, title.trim());
      if (result && result.success) {
        // The title state is already updated locally.
        // If main process sends 'clips-updated', ClipsList might re-render,
        // which could propagate new initialTitle if not handled carefully.
        // For now, assume local update is fine.
        console.log('Title updated successfully to:', result.newTitle);
      } else {
        console.error('Error updating title:', result ? result.error : 'Unknown error');
        setTitle(initialTitle); // Revert on error
      }
    } catch (err) {
      console.error('IPC Error updating title:', err);
      setTitle(initialTitle); // Revert on error
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      saveTitle();
    } else if (e.key === 'Escape') {
      setTitle(initialTitle); // Revert changes
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={handleTitleChange}
        onBlur={saveTitle} // Save when input loses focus
        onKeyDown={handleKeyDown}
        className="w-full p-2 text-lg font-semibold border border-blue-500 rounded-md"
        aria-label="Edit clip title"
      />
    );
  }

  return (
    <h2 
      className="text-xl font-semibold p-2 hover:bg-gray-100 rounded-md cursor-pointer truncate"
      onClick={() => setIsEditing(true)}
      title={`Click to edit title: ${title}`} // Show full title on hover
    >
      {title || "Untitled Clip"}
    </h2>
  );
}

export default EditableTitle;
