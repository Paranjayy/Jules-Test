import React, { useState, useEffect, useCallback } from 'react';
import PasteStackList from './PasteStackList';

// Max items in stack to prevent performance issues
const MAX_STACK_ITEMS = 50; 

function PasteStackApp() {
  const [stackItems, setStackItems] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [listFormat, setListFormat] = useState('numbered'); // 'numbered', 'bullet'
  // sortOrder state is not used for now as per initial focus
  // const [sortOrder, setSortOrder] = useState('time_desc'); 

  const handleNewClip = useCallback((clip) => {
    if (!isPaused) {
      // Add a uniqueId for list key purposes, especially if items might have same db ID temporarily
      // or if items are not from DB yet (though current flow sends DB items)
      const newItem = { ...clip, uniqueId: `${clip.id}-${Date.now()}` };
      setStackItems(prevItems => [newItem, ...prevItems.slice(0, MAX_STACK_ITEMS - 1)]);
    }
  }, [isPaused]);

  useEffect(() => {
    if (window.electron && window.electron.receive) {
      window.electron.receive('add-to-paste-stack', handleNewClip);
    } else {
      console.warn('PasteStackApp: window.electron.receive not found. IPC from main will not work.');
    }
    // Cleanup if electron.receive returns an unregister function
    return () => {
      // if (window.electron && window.electron.removeListener) { // Hypothetical
      //   window.electron.removeListener('add-to-paste-stack', handleNewClip);
      // }
    };
  }, [handleNewClip]);

  const handleRemoveItem = (uniqueItemIdToRemove, indexToRemove) => {
    // Prefer uniqueId if available, otherwise fallback to index (less robust if list reorders)
    setStackItems(prevItems => prevItems.filter(item => item.uniqueId !== uniqueItemIdToRemove));
  };

  const handleClearStack = async () => {
    if (stackItems.length > 0) {
      try {
        // Optionally, prompt for a run name or use a default
        const runName = `Paste Stack - ${new Date().toLocaleString()}`; 
        const result = await window.electron.invoke('save-paste-stack-history', stackItems, runName);
        if (result && result.success) {
          console.log("Paste stack history saved, Run ID:", result.runId);
        } else {
          console.error("Failed to save paste stack history:", result ? result.error : 'Unknown error');
          // Decide if we should still clear the stack if saving failed. For now, yes.
        }
      } catch (err) {
        console.error("Error invoking save-paste-stack-history:", err);
      }
    }
    setStackItems([]);
    console.log("Paste stack cleared from UI.");
  };

  const handleTogglePause = () => {
    setIsPaused(prev => !prev);
    console.log(isPaused ? "Paste stack resumed." : "Paste stack paused.");
  };
  
  const handlePasteAllSequentially = async () => {
    if (stackItems.length === 0) {
        console.log("No items to paste sequentially.");
        return;
    }
    console.log("Pasting all items sequentially...");
    setIsPaused(true); // Pause while pasting

    // Iterate in reverse for "first-in, first-out" pasting order from stack top
    const itemsToPaste = [...stackItems].reverse(); 

    for (const item of itemsToPaste) {
        try {
            // Use existing 'paste-clip' IPC for now, which handles hiding main window
            // This is simpler than creating 'paste-stack-item-sequentially' if 'paste-clip' is sufficient
            // The 'paste-clip' handler in main.js needs to be robust to not assume main window context always.
            // For now, it hides the focused window IF it's OmniLaunch. This might hide the paste stack window.
            // A dedicated 'paste-stack-item-sequentially' might be better to avoid hiding paste stack window.
            // Let's assume 'paste-clip' is okay for now, or we'll create the new IPC later.
            
            // The 'paste-clip' in main.js does:
            // 1. Write item to clipboard
            // 2. Hide focused window (if it's an OmniLaunch window)
            // 3. Simulate Ctrl/Cmd+V
            // 4. Update DB for the pasted clip
            
            // For paste stack, we don't necessarily want to hide the paste stack window.
            // And we don't want to update DB for items from the stack as they are already in DB.
            // So, a dedicated IPC is better.
            
            // Let's use a placeholder for the dedicated IPC for now.
            // If 'paste-stack-item-sequentially' is not yet implemented in main.js, this will fail.
             const result = await window.electron.invoke('paste-stack-item-sequentially', item);
             if (!result || !result.success) {
                 console.error('Error pasting item:', item.id, result ? result.error : 'Unknown error');
                 // Optional: Stop pasting on first error, or collect errors.
                 break; 
             }
            await new Promise(resolve => setTimeout(resolve, 500)); // Delay between pastes
        } catch (err) {
            console.error('Error during sequential paste:', err);
            break; 
        }
    }
    setIsPaused(false); // Resume after pasting
    console.log("Sequential paste finished.");
    // Optionally clear stack after pasting all
    // handleClearStack();
  };


  return (
    <div className="flex flex-col h-screen bg-gray-800 text-white p-3 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-gray-700">
        <h1 className="text-lg font-semibold">Paste Stack</h1>
        <div className="flex space-x-2">
          <button
            onClick={handleTogglePause}
            className={`px-3 py-1 text-xs rounded-md ${isPaused ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'} text-white`}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={handleClearStack}
            className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded-md"
          >
            Clear Stack
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-2 mb-1 text-xs">
        <label htmlFor="listFormatSelect" className="text-gray-300">Format:</label>
        <select
          id="listFormatSelect"
          value={listFormat}
          onChange={(e) => setListFormat(e.target.value)}
          className="px-2 py-0.5 border border-gray-600 rounded-md bg-gray-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="numbered">Numbered</option>
          <option value="bullet">Bullet</option>
        </select>
        {/* Sort order dropdown can be added here later */}
      </div>

      <PasteStackList 
        items={stackItems} 
        onRemoveItem={handleRemoveItem}
        listFormat={listFormat}
      />
      
      <button
        onClick={handlePasteAllSequentially}
        disabled={stackItems.length === 0}
        className={`w-full mt-2 px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${
            stackItems.length > 0 
            ? 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500' 
            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
        }`}
      >
        Paste All Sequentially
      </button>
    </div>
  );
}

export default PasteStackApp;
