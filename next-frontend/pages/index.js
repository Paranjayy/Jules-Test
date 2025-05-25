// In next-frontend/pages/index.js

import React, { useState, useEffect, useRef } from 'react';
import OnePanelLayout from '@/components/layouts/OnePanelLayout';
import ThreePanelLayout from '@/components/layouts/ThreePanelLayout';
import ClipboardLeftSidebar from '@/components/clipboard/ClipboardLeftSidebar'; // Import new component
import { Button } from '@/components/ui/button';

export default function LauncherPage() {
  const [commandValue, setCommandValue] = useState('');
  const [currentLayout, setCurrentLayout] = useState('onePanel');

  // State for Clipboard Sidebar
  const [activeFolderId, setActiveFolderId] = useState('all'); // Default selected folder
  const [activeTagId, setActiveTagId] = useState(null);    // Default selected tag

  // IPC Test states
  const [ipcResult, setIpcResult] = useState('');
  const [ipcError, setIpcError] = useState('');
  
  // Ref for command input (primarily for OnePanelLayout)
  // const commandInputRef = useRef(null); 

  const handleCommandChange = (event) => {
    setCommandValue(event.target.value);
  };

  const handleCommandSubmit = () => {
    console.log('Command submitted in LauncherPage:', commandValue);
    const lowerCommand = commandValue.toLowerCase();

    if (lowerCommand === 'clipboard') {
      setCurrentLayout('threePanel');
      setCommandValue('');
      setIpcError(''); 
    } else if (lowerCommand === 'launcher') {
      setCurrentLayout('onePanel');
      setCommandValue('');
      setIpcError('');
    } else if (lowerCommand.trim() !== '') {
      console.log(`Unknown command: ${commandValue}`);
      setIpcError(`Unknown command: "${commandValue}"`);
    } else {
      setIpcError('');
    }
  };
  
  // Folder and Tag selection handlers for ClipboardLeftSidebar
  const handleFolderSelect = (folderId) => {
    setActiveFolderId(folderId);
    setActiveTagId(null); // Reset tag selection when a folder is selected
    console.log(`Folder selected: ${folderId}`);
    // Future: Fetch clips for this folder
  };

  const handleTagSelect = (tagId) => {
    setActiveTagId(tagId);
    // setActiveFolderId(null); // Optional: Reset folder if tags span across folders or are global
    console.log(`Tag selected: ${tagId}`);
    // Future: Fetch clips for this tag
  };


  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        if (currentLayout === 'threePanel') {
          setCurrentLayout('onePanel');
          setCommandValue('');
        } else {
          const activeElementId = document.activeElement && document.activeElement.id;
          if (activeElementId === 'commandInput' && commandValue !== '') {
            setCommandValue('');
          } else if (commandValue === '') {
            if (window.electron && window.electron.send) {
              window.electron.send('close-window');
            }
          }
        }
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [commandValue, currentLayout]);

  const testIpcCall = async () => {
    setIpcResult('');
    setIpcError('');
    if (window.electron) {
      try {
        const result = await window.electron.invoke('test-ipc');
        setIpcResult(result);
      } catch (error) {
        setIpcError(error.message || 'An unknown IPC error occurred.');
      }
    } else {
      setIpcError('window.electron API not found.');
    }
  };
  
  // Define content for ThreePanelLayout
  const clipboardSidebar = (
    <ClipboardLeftSidebar
      activeFolderId={activeFolderId}
      onFolderSelect={handleFolderSelect}
      activeTagId={activeTagId}
      onTagSelect={handleTagSelect}
    />
  );
  const middlePanelPlaceholder = <div className="p-4">Middle Panel (Clips List Placeholder)</div>;
  const rightPanelPlaceholder = <div className="p-4">Right Panel (Metadata Placeholder)</div>;

  return (
    <>
      {currentLayout === 'onePanel' ? (
        <OnePanelLayout
          commandValue={commandValue}
          onCommandChange={handleCommandChange}
          onCommandSubmit={handleCommandSubmit}
        />
      ) : ( // currentLayout === 'threePanel'
        <ThreePanelLayout
          leftPanel={clipboardSidebar}
          middlePanel={middlePanelPlaceholder}
          rightPanel={rightPanelPlaceholder}
        />
      )}

      <div style={{ position: 'fixed', bottom: '10px', right: '10px', zIndex: 100 }}>
        <Button variant="outline" onClick={() => setCurrentLayout(prev => prev === 'onePanel' ? 'threePanel' : 'onePanel')}>
          Toggle Layout (Dev)
        </Button>
        <Button variant="outline" onClick={testIpcCall} style={{ marginLeft: '5px' }}>
          Test IPC (Dev)
        </Button>
        {ipcResult && <p className="text-xs text-green-500 mt-1">IPC: {ipcResult}</p>}
        {ipcError && <p className="text-xs text-red-500 mt-1">IPC Err: {ipcError}</p>}
      </div>
    </>
  );
}
