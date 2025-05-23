import React, { useState, useEffect, useRef } from 'react';

function ActionsPalette({ isOpen, onClose, selectedClipIds, activeClip, onActionCompleted }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [availableActions, setAvailableActions] = useState([]);
  const [filteredActions, setFilteredActions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Define actions based on props
  useEffect(() => {
    const actions = [];
    if (activeClip && selectedClipIds.length === 1) {
      actions.push({ 
        id: 'paste', 
        label: 'Paste to Active App', 
        handler: async () => { 
          const result = await window.electron.invoke('paste-clip', activeClip.id);
          return result.success ? 'Pasted!' : `Error: ${result.error}`;
        } 
      });
      actions.push({ 
        id: 'copy', 
        label: 'Copy to Clipboard', 
        handler: async () => { 
          const result = await window.electron.invoke('copy-clip-to-system', activeClip.id); 
          return result.success ? 'Copied to clipboard!' : `Error: ${result.error}`;
        } 
      });
      actions.push({ 
        id: 'pin', 
        label: activeClip.is_pinned ? 'Unpin Entry' : 'Pin Entry', 
        handler: async () => { 
          const result = await window.electron.invoke('toggle-pin-clip', activeClip.id); 
          return result.success ? (result.newPinnedState ? 'Pinned!' : 'Unpinned!') : `Error: ${result.error}`;
        } 
      });
    }
    if (selectedClipIds && selectedClipIds.length > 0) {
      actions.push({ 
        id: 'delete', 
        label: `Delete ${selectedClipIds.length} Entr${selectedClipIds.length > 1 ? 'ies' : 'y'}`, 
        handler: async () => { 
          let successCount = 0;
          for (const id of selectedClipIds) { 
            const result = await window.electron.invoke('delete-clip', id); 
            if (result.success) successCount++;
          } 
          return `${successCount} entr${successCount > 1 ? 'ies' : 'y'} deleted.`;
        } 
      });
      actions.push({
        id: 'saveAsFile',
        label: 'Save as File...',
        handler: async () => {
          const result = await window.electron.invoke('save-clip-as-file', activeClip.id);
          return result.success ? `Saved to: ${result.filePath}` : (result.canceled ? 'Save cancelled.' : `Error: ${result.error}`);
        }
      });
      actions.push({
        id: 'appendToClipboard',
        label: 'Append to Clipboard (Text/Link only)',
        disabled: !(activeClip && (activeClip.content_type === 'text' || activeClip.content_type === 'link')),
        handler: async () => {
          const result = await window.electron.invoke('append-to-clipboard', activeClip.id);
          return result.success ? 'Appended to clipboard!' : `Error: ${result.error}`;
        }
      });
      actions.push({
        id: 'pasteNoHide',
        label: 'Paste and Keep Window Open',
        handler: async () => {
          const result = await window.electron.invoke('paste-clip-no-hide', activeClip.id);
          return result.success ? 'Pasted (window kept open)!' : `Error: ${result.error}`;
        }
      });
    }
    // "Delete All Clips in View" - This is context-dependent (current folder/search results)
    // The actual filtering/scope determination will be handled by App.js before calling IPC.
    // This action is always available, but its impact depends on the current view context in App.js.
    actions.push({
      id: 'deleteAllInView',
      label: 'Delete All Clips in Current View...', // ellipsis indicates further confirmation
      handler: () => {
        // This handler will call a prop passed from App.js to open the confirmation modal
        if (onDeleteAllInView) onDeleteAllInView();
        return "Opening delete all confirmation..."; // Status for App.js
      }
    });

    actions.push({ 
      id: 'saveAsSnippet', 
      label: 'Save as Snippet...', 
      disabled: !onSaveAsSnippet || !(activeClip && selectedClipIds.length === 1), 
      handler: () => { if (onSaveAsSnippet) onSaveAsSnippet(); return "Opening save as snippet...";}
    });
    
    setAvailableActions(actions);
  }, [activeClip, selectedClipIds, onSaveAsSnippet, onDeleteAllInView]); // Added onDeleteAllInView

  // Filter actions based on searchTerm
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredActions(availableActions.filter(action => !action.disabled));
    } else {
      setFilteredActions(
        availableActions.filter(action => 
          !action.disabled && action.label.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    setSelectedIndex(0); // Reset index on filter change
  }, [searchTerm, availableActions]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredActions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredActions[selectedIndex]) {
          executeAction(filteredActions[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredActions, selectedIndex, onClose]); // Added onClose to dependencies

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && listRef.current.children[selectedIndex]) {
      listRef.current.children[selectedIndex].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [selectedIndex]);


  const executeAction = async (action) => {
    if (action.disabled) return;
    let statusMessage = 'Action executed.';
    if (action.handler) {
      statusMessage = await action.handler();
    }
    onActionCompleted(statusMessage);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-start justify-center z-50 pt-20 px-4">
      <div className="bg-white p-4 rounded-lg shadow-xl w-full max-w-md">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Type an action..."
          className="w-full p-2 mb-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div ref={listRef} className="max-h-60 overflow-y-auto">
          {filteredActions.length > 0 ? (
            filteredActions.map((action, index) => (
              <div
                key={action.id}
                onClick={() => executeAction(action)}
                className={`p-2 rounded-md cursor-pointer text-sm ${
                  index === selectedIndex ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
                } ${action.disabled ? 'text-gray-400 cursor-not-allowed' : ''}`}
              >
                {action.label}
              </div>
            ))
          ) : (
            <p className="text-gray-500 p-2 text-sm">No actions found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ActionsPalette;
