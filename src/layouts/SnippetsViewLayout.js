import React, { useState, useEffect } from 'react';
import SnippetFoldersList from '../components/snippets/SnippetFoldersList';
import SnippetsList from '../components/snippets/SnippetsList';
import SnippetEditor from '../components/snippets/SnippetEditor';
// import TopBar from '../components/topbar/TopBar'; // Could add a TopBar specific to snippets if needed

function SnippetsViewLayout({ onNavigate, focusedPanel, requestFocusChange }) {
  const [activeSnippetFolderId, setActiveSnippetFolderId] = useState('all'); // 'all', 'inbox', or a folder ID
  const [selectedSnippet, setSelectedSnippet] = useState(null);
  
  // State for a simple search bar within snippets view (can be enhanced later)
  const [snippetSearchTerm, setSnippetSearchTerm] = useState('');

  // This would be the equivalent of App.js's setFocusedPanel for this view
  const [currentFocusedSnippetPanel, setCurrentFocusedSnippetPanel] = useState('snippetFolders'); 

  useEffect(() => {
    // If App.js signals focus to 'snippetFolders', 'snippetsList', or 'snippetEditor'
    if (focusedPanel === 'snippetFolders' || focusedPanel === 'snippetsList' || focusedPanel === 'snippetEditor') {
        setCurrentFocusedSnippetPanel(focusedPanel);
    } else if (!focusedPanel && currentAppView === 'snippets') { // Default focus when switching to snippets view
        setCurrentFocusedSnippetPanel('snippetFolders');
    }
  }, [focusedPanel]);


  const handleFolderSelect = (folderId) => {
    setActiveSnippetFolderId(folderId === 'all' ? 'all' : folderId); // Ensure 'all' is string 'all'
    setSelectedSnippet(null); // Clear selected snippet when folder changes
    setCurrentFocusedSnippetPanel('snippetsList'); // Move focus to snippets list
  };

  const handleSnippetSelect = (snippet) => {
    setSelectedSnippet(snippet);
    setCurrentFocusedSnippetPanel('snippetEditor'); // Move focus to editor
  };

  const handleSnippetSave = async (snippetId, snippetData) => {
    // This function will be called by SnippetEditor
    // It should invoke the 'update-snippet' or 'add-snippet' IPC
    let result;
    if (snippetId) { // Existing snippet
      result = await window.electron.invoke('update-snippet', snippetId, snippetData);
    } else { // New snippet (SnippetEditor might need a "new" mode or a separate NewSnippetForm)
      result = await window.electron.invoke('add-snippet', snippetData);
    }
    if (result && result.success) {
      console.log('Snippet saved successfully', result);
      // Trigger a refresh of the snippets list (snippets-updated event should handle this)
      // Optionally, if adding a new snippet, select it:
      if (!snippetId && result.id) {
        const newSnippet = await window.electron.invoke('get-snippet-by-id', result.id);
        if(newSnippet && !newSnippet.error) setSelectedSnippet(newSnippet);
      }
      return true;
    } else {
      console.error('Error saving snippet:', result ? result.error : 'Unknown error');
      return false;
    }
  };

  const handleSnippetDelete = async (snippetId) => {
    const result = await window.electron.invoke('delete-snippet', snippetId);
    if (result && result.success) {
      console.log('Snippet deleted successfully');
      setSelectedSnippet(null); // Clear selection
      // snippets-updated event should refresh the list
    } else {
      console.error('Error deleting snippet:', result ? result.error : 'Unknown error');
    }
  };
  
  const handleSnippetPaste = async (snippetId) => {
    const result = await window.electron.invoke('paste-snippet-content', snippetId);
    if (result && result.success) {
        console.log("Snippet pasted successfully via SnippetEditor");
        // Potentially update status message in a main status bar if it existed for SnippetsView
    } else {
        console.error("Error pasting snippet from SnippetEditor:", result ? result.error : 'Unknown error');
    }
  };

  const handleInternalFocusChange = (panelName) => {
    setCurrentFocusedSnippetPanel(panelName);
    // This could also call requestFocusChange if focus needs to jump out of SnippetsViewLayout
  };
  
  // Simple search bar for snippets
  const SnippetSearchBar = () => (
    <div className="p-2 bg-gray-100 border-b border-gray-300">
      <input 
        type="search"
        placeholder="Search snippets by title, content, or keyword..."
        value={snippetSearchTerm}
        onChange={(e) => setSnippetSearchTerm(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );


  return (
    <div className="flex flex-col h-screen">
      {/* Optional: A TopBar specific to Snippets View could go here */}
      {/* For now, a simple search bar within the layout */}
import NewSnippetButton from '../components/snippets/NewSnippetButton'; // Import NewSnippetButton

function SnippetsViewLayout({ onNavigate, focusedPanel, requestFocusChange }) {
  const [activeSnippetFolderId, setActiveSnippetFolderId] = useState('all'); // 'all', 'inbox', or a folder ID
  const [selectedSnippet, setSelectedSnippet] = useState(null);
  const [snippetSearchTerm, setSnippetSearchTerm] = useState('');
  const [currentFocusedSnippetPanel, setCurrentFocusedSnippetPanel] = useState('snippetFolders'); 

  useEffect(() => {
    if (focusedPanel === 'snippetFolders' || focusedPanel === 'snippetsList' || focusedPanel === 'snippetEditor') {
        setCurrentFocusedSnippetPanel(focusedPanel);
    } else if (focusedPanel === 'snippets' || !focusedPanel) { // Default focus when switching to snippets view
        setCurrentFocusedSnippetPanel('snippetFolders');
    }
  }, [focusedPanel]);

  const handleFolderSelect = (folderId) => {
    setActiveSnippetFolderId(folderId === 'all' ? 'all' : folderId); 
    setSelectedSnippet(null); 
    setCurrentFocusedSnippetPanel('snippetsList'); 
  };

  const handleSnippetSelect = (snippet) => {
    setSelectedSnippet(snippet);
    setCurrentFocusedSnippetPanel('snippetEditor'); 
  };

  const handleNewSnippet = () => {
    setSelectedSnippet({ // Create a "new" snippet object template
      id: null, // No ID for new snippet
      title: '',
      content: '',
      keyword: '',
      folder_id: activeSnippetFolderId === 'all' || activeSnippetFolderId === 'inbox' ? null : activeSnippetFolderId, // Assign current folder or null
    });
    setCurrentFocusedSnippetPanel('snippetEditor'); // Focus editor for the new snippet
  };

  const handleSnippetSave = async (snippetId, snippetData) => {
    let result;
    if (snippetId) { 
      result = await window.electron.invoke('update-snippet', snippetId, snippetData);
    } else { 
      result = await window.electron.invoke('add-snippet', snippetData);
    }
    if (result && result.success) {
      console.log('Snippet saved successfully', result);
      // snippets-updated event should refresh lists.
      // If adding a new snippet, select it.
      if (!snippetId && result.id) {
        const newSnippet = await window.electron.invoke('get-snippet-by-id', result.id);
        if(newSnippet && !newSnippet.error) setSelectedSnippet(newSnippet);
      } else if (snippetId) {
        // If updating, re-fetch the selected snippet to get the latest version
        const updatedSnippet = await window.electron.invoke('get-snippet-by-id', snippetId);
        if(updatedSnippet && !updatedSnippet.error) setSelectedSnippet(updatedSnippet);
      }
      return true;
    } else {
      console.error('Error saving snippet:', result ? result.error : 'Unknown error');
      return false;
    }
  };

  const handleSnippetDelete = async (snippetId) => {
    const result = await window.electron.invoke('delete-snippet', snippetId);
    if (result && result.success) {
      console.log('Snippet deleted successfully');
      setSelectedSnippet(null); 
    } else {
      console.error('Error deleting snippet:', result ? result.error : 'Unknown error');
    }
  };
  
  const handleSnippetPaste = async (snippetId) => {
    const result = await window.electron.invoke('paste-snippet-content', snippetId);
    if (result && result.success) {
        console.log("Snippet pasted successfully via SnippetEditor");
    } else {
        console.error("Error pasting snippet from SnippetEditor:", result ? result.error : 'Unknown error');
    }
  };

  const handleInternalFocusChange = (panelName) => {
    setCurrentFocusedSnippetPanel(panelName);
  };
  
  const SnippetSearchBar = () => (
    <div className="p-2 bg-gray-100 border-b border-gray-300">
      <input 
        type="search"
        placeholder="Search snippets by title, content, or keyword..."
        value={snippetSearchTerm}
        onChange={(e) => setSnippetSearchTerm(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center p-2 bg-gray-200 border-b border-gray-300">
        <button onClick={() => onNavigate('clipboard')} className="mr-4 p-2 bg-gray-300 hover:bg-gray-400 rounded text-sm">
            &larr; Back to Clipboard
        </button>
        <h1 className="text-lg font-semibold">Snippets Management</h1>
        <NewSnippetButton onClick={handleNewSnippet} />
      </div>
      
      <SnippetSearchBar />

      <div className="flex flex-grow overflow-hidden">
        <div className="w-1/4 border-r border-gray-300 bg-gray-50 h-full overflow-y-auto">
          <SnippetFoldersList
            activeFolderId={activeSnippetFolderId}
            onFolderSelect={handleFolderSelect}
            isFocused={currentFocusedSnippetPanel === 'snippetFolders'}
            requestFocusChange={handleInternalFocusChange}
          />
        </div>
        <div className="w-1/2 border-r border-gray-300 bg-white h-full overflow-y-auto">
          <SnippetsList
            activeFolderId={activeSnippetFolderId}
            onSnippetSelect={handleSnippetSelect}
            searchTerm={snippetSearchTerm} 
            isFocused={currentFocusedSnippetPanel === 'snippetsList'}
            requestFocusChange={handleInternalFocusChange}
            onRequestPasteSnippet={handleSnippetPaste} // Pass the handler
          />
        </div>
        <div className="w-1/2 bg-gray-50 h-full overflow-y-auto">
          <SnippetEditor
            selectedSnippet={selectedSnippet}
            onSave={handleSnippetSave}
            onDelete={handleSnippetDelete}
            onPaste={handleSnippetPaste}
            isFocused={currentFocusedSnippetPanel === 'snippetEditor'}
            requestFocusChange={handleInternalFocusChange}
          />
        </div>
      </div>
    </div>
  );
}

export default SnippetsViewLayout;
