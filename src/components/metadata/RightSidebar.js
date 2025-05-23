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


  const fetchDetailedClipData = useCallback(async (clipToFetch) => {
    if (!clipToFetch || !clipToFetch.id) {
      setDetailedClip(null);
      setError(null);
      return;
    }
    setError(null);
    try {
      const clipDataResult = await window.electron.invoke('get-clip-data', clipToFetch.id);

      if (clipDataResult && !clipDataResult.error && clipDataResult.data !== undefined) {
        let parsedMetadata = clipToFetch.metadata;
        if (typeof clipToFetch.metadata === 'string') {
            try {
                parsedMetadata = JSON.parse(clipToFetch.metadata);
            } catch (e) {
                console.error("Error parsing metadata string from clipToFetch:", e);
            }
        }
        // Ensure we use the potentially updated title/other fields from clipToFetch
        // if it was updated by an edit action before this full data fetch.
        setDetailedClip({
          ...clipToFetch, 
          data: clipDataResult.data, 
          metadata: parsedMetadata, 
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
  }, []); // Removed selectedClip from dependency array, will pass it directly

  useEffect(() => {
    if (selectedClip && selectedClip.id) {
      fetchDetailedClipData(selectedClip);
    } else {
      setDetailedClip(null); // Clear if no clip selected
    }
  }, [selectedClip, fetchDetailedClipData]);

  // Listen for 'clips-updated' to refresh details if the current clip was modified
  useEffect(() => {
    const handleClipsUpdated = () => {
      if (detailedClip && detailedClip.id) {
        // Re-fetch the currently displayed clip to get any updates
        // (e.g., title change, content change from another source, pin status)
        // We need the full clip object to pass to fetchDetailedClipData
        // This might require another IPC call if selectedClip prop doesn't auto-update
        // For now, let's assume 'clips-updated' means we should re-evaluate 'selectedClip' prop
        // This effect will re-run if selectedClip prop itself changes due to App.js re-fetching.
        // If selectedClip prop doesn't change but its content in DB did, we need a direct fetch.
        // Let's try fetching based on ID directly.
        window.electron.invoke('get-clip-by-id', detailedClip.id).then(refetchedClip => {
          if (refetchedClip && !refetchedClip.error) {
            fetchDetailedClipData(refetchedClip); // Pass the potentially updated clip
          } else {
            // Clip might have been deleted
            setDetailedClip(null);
          }
        });
      }
    };
    if (window.electron && window.electron.receive) {
        window.electron.receive('clips-updated', handleClipsUpdated);
    }
    return () => { /* Cleanup if window.electron.receive provides it */ };
  }, [detailedClip, fetchDetailedClipData]); // selectedClip removed from here to avoid loop if it's not changing

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
      <EditableTitle 
        clipId={detailedClip.id} 
        initialTitle={detailedClip.title || 'Untitled Clip'} 
        // onTitleUpdate can be added if EditableTitle should inform parent directly
      />
      <PreviewArea 
        clip={detailedClip} 
        onClipContentUpdate={(updatedClipData) => {
          // When content is edited in PreviewArea, update detailedClip state here
          // This ensures RightSidebar has the latest version before any potential re-fetches.
          setDetailedClip(prev => ({...prev, ...updatedClipData}));
          // App.js will also get 'clips-updated' and refresh ClipsList, which might
          // re-select the clip, triggering a full refresh of detailedClip via selectedClip prop.
        }} 
      />
      <MetadataDisplay clip={detailedClip} />
      <ClipTagsEditor clipId={detailedClip.id} />
    </div>
  );
}

export default RightSidebar;
