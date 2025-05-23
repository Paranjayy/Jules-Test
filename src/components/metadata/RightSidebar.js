import React, { useState, useEffect, useCallback } from 'react';
import EditableTitle from './EditableTitle';
import PreviewArea from './PreviewArea';
import MetadataDisplay from './MetadataDisplay';
import ClipTagsEditor from './ClipTagsEditor';

function RightSidebar({ selectedClip, requestFocusChange, isFocused }) { // Added isFocused
  const [detailedClip, setDetailedClip] = useState(null);
  const [error, setError] = useState(null);
  const sidebarRef = React.useRef(null);
  const titleRef = React.useRef(null); // Ref for EditableTitle or first focusable element


  const fetchDetailedClipData = useCallback(async () => {
    if (!selectedClip || !selectedClip.id) {
      setDetailedClip(null);
      setError(null);
      return;
    }
    setError(null);
    try {
      // First, assume selectedClip has most info (id, title, content_type, preview_text, metadata string)
      // We primarily need to fetch the full 'data' field.
      const clipDataResult = await window.electron.invoke('get-clip-data', selectedClip.id);

      if (clipDataResult && !clipDataResult.error && clipDataResult.data !== undefined) {
        // Combine the full data with the existing selectedClip info
        // The 'metadata' in selectedClip should be a string, parse it for MetadataDisplay
        let parsedMetadata = selectedClip.metadata;
        if (typeof selectedClip.metadata === 'string') {
            try {
                parsedMetadata = JSON.parse(selectedClip.metadata);
            } catch (e) {
                console.error("Error parsing metadata string from selectedClip:", e);
                // Keep metadata as is or set to empty object
            }
        }

        setDetailedClip({
          ...selectedClip, // Contains id, title, content_type, preview_text, source_app_name etc.
          data: clipDataResult.data, // Add the full data payload
          metadata: parsedMetadata, // Ensure metadata is an object if parsed
        });
      } else if (clipDataResult && clipDataResult.error) {
        console.error('Error fetching clip data:', clipDataResult.error);
        setError(`Error loading clip details: ${clipDataResult.error}`);
        setDetailedClip(null);
      } else {
        console.error('Unexpected response from get-clip-data:', clipDataResult);
        setError('Could not load clip details.');
        setDetailedClip(null);
      }
    } catch (err) {
      console.error('IPC Error fetching clip data:', err);
      setError(`Error loading clip details: ${err.message}`);
      setDetailedClip(null);
    }
  }, [selectedClip]);

  useEffect(() => {
    fetchDetailedClipData();
  }, [fetchDetailedClipData]);

  // Listen for 'clips-updated' to refresh details if the current clip was modified
  useEffect(() => {
    const handleClipsUpdated = () => {
      if (detailedClip && detailedClip.id) {
        // console.log('RightSidebar received clips-updated, re-fetching details for clip:', detailedClip.id);
        fetchDetailedClipData(); 
      }
    };
    if (window.electron && window.electron.receive) {
        window.electron.receive('clips-updated', handleClipsUpdated);
    }
    return () => { /* Cleanup if window.electron.receive provides it */ };
  }, [detailedClip, fetchDetailedClipData]);

  // Focus management
  useEffect(() => {
    if (isFocused && sidebarRef.current) {
      // Try to focus the main sidebar container first, or a specific element like title
      // For robust focus, EditableTitle might need to expose a focus method via useImperativeHandle
      // Or, we can try focusing the h2 within it if that's consistently available.
      // For now, focusing the sidebarRef itself.
      sidebarRef.current.focus();
    }
  }, [isFocused]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isFocused) return;
      if (event.key === 'ArrowLeft') {
          if (requestFocusChange) requestFocusChange('clips');
      }
      // Potentially handle Up/Down arrow to scroll within RightSidebar if it's overflowing
      // and not handled by internal components.
    };

    const currentRef = sidebarRef.current;
    if (currentRef) {
        currentRef.addEventListener('keydown', handleKeyDown);
    }

    return () => {
        if (currentRef) {
            currentRef.removeEventListener('keydown', handleKeyDown);
        }
    };
  }, [isFocused, requestFocusChange]);


  if (error) {
    return <div className="p-4 text-red-500 w-full md:w-1/3 h-screen overflow-y-auto bg-gray-100 border-l border-gray-300">{error}</div>;
  }

  if (!detailedClip) {
    return (
      <div 
        ref={sidebarRef}
        className="p-4 text-gray-500 w-full md:w-1/3 h-screen overflow-y-auto bg-gray-100 border-l border-gray-300 focus:outline-none"
        tabIndex={-1} 
      >
        Select a clip to see details.
      </div>
    );
  }

  return (
    <div 
      ref={sidebarRef}
      className="w-full md:w-1/3 h-screen overflow-y-auto bg-gray-100 border-l border-gray-300 p-4 space-y-4 focus:outline-none"
      tabIndex={-1} 
    >
      {/* Consider passing a ref to EditableTitle if direct focus is needed on its input */}
      <EditableTitle clipId={detailedClip.id} initialTitle={detailedClip.title || 'Untitled Clip'} />
      <PreviewArea clip={detailedClip} />
      <MetadataDisplay clip={detailedClip} />
      <ClipTagsEditor clipId={detailedClip.id} />
    </div>
  );
}

export default RightSidebar;
