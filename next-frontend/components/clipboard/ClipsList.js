// In next-frontend/components/clipboard/ClipsList.js
import React, { useState, useEffect, useRef } from 'react';
import ClipItem from './ClipItem'; // Import ClipItem
// import { ScrollArea } from '@/components/ui/scroll-area';

export default function ClipsList({ activeFolderId, activeTagId, onClipSelect }) {
  const [clips, setClips] = useState([]);
  const [clipsLoading, setClipsLoading] = useState(false);
  const [clipsError, setClipsError] = useState(null);
  const [selectedClipId, setSelectedClipId] = useState(null);

  // For keyboard navigation
  const [focusedClipIndex, setFocusedClipIndex] = useState(-1);
  const clipItemRefs = useRef([]);

  useEffect(() => {
    const fetchClips = async () => {
      if (!window.electron) {
        setClipsError("Electron API not available.");
        return;
      }
      // Determine what to fetch based on activeFolderId or activeTagId
      // For now, prioritizing activeTagId if present, else activeFolderId.
      // LauncherPage should ensure activeFolderId is 'all' or 'inbox' if no specific folder.
      const idToFetch = activeTagId || activeFolderId;
      // We might need a way to distinguish if it's a tag ID or folder ID for the backend,
      // or the backend 'get-clips' handles it. Assuming 'get-clips' can take either a folderId
      // or potentially a special format for tags, or LauncherPage passes a type.
      // For now, we assume 'get-clips' primarily works with folderId.
      // If activeTagId is present, we might need a different IPC or a modified 'get-clips'.
      // Let's assume for now 'get-clips' only takes folderId. A more robust solution is needed if tags are to filter clips directly via 'get-clips'.
      // For this iteration, we will simplify and say ClipsList primarily reacts to activeFolderId.
      // Tag filtering will be a more advanced feature or will require LauncherPage to pre-filter/fetch.

      if (!activeFolderId && !activeTagId) { // Or some other condition to not fetch
        setClips([]);
        setSelectedClipId(null);
        if (onClipSelect) onClipSelect(null); // Notify parent that selection is cleared
        return;
      }
      
      // For now, let's assume 'get-clips' uses folderId. If a tag is selected,
      // the actual filtering logic might be more complex (e.g., fetch all clips for a folder then filter by tag,
      // or a dedicated 'get-clips-by-tag' IPC call).
      // Let's simplify: if a tag is selected, we'll just log it and clear clips for now,
      // focusing on folder-based clip fetching.
      let effectiveFolderId = activeFolderId;
      if (activeTagId) {
        console.log(`Tag selected: ${activeTagId}. Clip fetching by tag not fully implemented in this step. Clearing clips.`);
        setClips([]);
        setClipsLoading(false);
        setSelectedClipId(null);
        if (onClipSelect) onClipSelect(null);
        return; // Or fetch all clips and then filter client-side if small dataset
      }


      console.log(`ClipsList: Fetching clips for folderId: ${effectiveFolderId}`);
      setClipsLoading(true);
      setClipsError(null);
      setSelectedClipId(null); // Clear selection when folder changes
      if (onClipSelect) onClipSelect(null); // Notify parent

      try {
        const fetchedClips = await window.electron.invoke('get-clips', effectiveFolderId);
        if (fetchedClips && !fetchedClips.error) {
          setClips(fetchedClips);
        } else if (fetchedClips && fetchedClips.error) {
          setClipsError(fetchedClips.error);
          setClips([]);
        } else {
          setClips([]); // Default to empty if no error but unexpected response
        }
      } catch (err) {
        console.error("Error fetching clips:", err);
        setClipsError(err.message || "An unexpected error occurred.");
        setClips([]);
      } finally {
        setClipsLoading(false);
      }
    };

    fetchClips();
  }, [activeFolderId, activeTagId]); // Re-fetch when folder or tag changes

  useEffect(() => {
    clipItemRefs.current = clipItemRefs.current.slice(0, clips.length);
  }, [clips]);

  useEffect(() => {
    if (focusedClipIndex !== -1 && clipItemRefs.current[focusedClipIndex]) {
      clipItemRefs.current[focusedClipIndex].focus();
    }
  }, [focusedClipIndex]);

  const handleSelectClip = (clip) => { // Expecting full clip object now
    setSelectedClipId(clip.id);
    if (onClipSelect) {
      onClipSelect(clip); // Pass the full selected clip object to parent
    }
  };
  
  const handleClipsListKeyDown = (event) => {
    if (clips.length === 0) return;
    let newIndex = focusedClipIndex;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      newIndex = focusedClipIndex === -1 ? 0 : Math.min(focusedClipIndex + 1, clips.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      newIndex = focusedClipIndex === -1 ? clips.length - 1 : Math.max(focusedClipIndex - 1, 0);
    }
    setFocusedClipIndex(newIndex);

    if (event.key === 'Enter' && newIndex !== -1) {
      event.preventDefault();
      if (clips[newIndex]) {
        handleSelectClip(clips[newIndex]);
      }
    }
  };


  if (clipsLoading) {
    return <div className="p-4 text-slate-500 dark:text-slate-400 text-center">Loading clips...</div>;
  }

  if (clipsError) {
    return <div className="p-4 text-red-500 text-center">Error: {clipsError}</div>;
  }

  return (
    <div 
        className="h-full flex flex-col bg-white dark:bg-slate-800"
        onKeyDown={handleClipsListKeyDown}
        tabIndex={clips.length > 0 ? 0 : -1} // Make list focusable for keyboard nav
        ref={el => { if (el && focusedClipIndex === -1 && clips.length > 0) el.focus();}}
    >
      {/* <ScrollArea className="flex-grow"> */}
        <div className="flex-grow p-1 space-y-1 overflow-y-auto"> {/* Reduced padding and space */}
          {clips.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-500 dark:text-slate-400">
                No clips in {activeFolderId === 'all' ? 'any folder' : activeTagId ? 'this tag' : `this folder`}.
              </p>
            </div>
          ) : (
            clips.map((clip, index) => (
              <ClipItem
                key={clip.id}
                ref={el => clipItemRefs.current[index] = el} // For focusing items
                clip={clip}
                isSelected={clip.id === selectedClipId}
                onSelect={() => {
                    handleSelectClip(clip);
                    setFocusedClipIndex(index); // Update focus on select
                }}
              />
            ))
          )}
        </div>
      {/* </ScrollArea> */}
    </div>
  );
}
