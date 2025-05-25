import React from 'react';
// Import any icons or specific Shadcn UI components if desired, e.g., an Avatar for icons
// For now, we'll use simple text placeholders for content types.

export default function ClipItem({ clip, isSelected, onSelect }) {
  if (!clip) {
    return null; // Or some placeholder for an empty/invalid clip prop
  }

  // Determine content type display - basic version
  let contentTypeDisplay = 'TXT'; // Default
  if (clip.content_type === 'image') {
    contentTypeDisplay = 'IMG';
  } else if (clip.content_type === 'file') { // Assuming you might have a 'file' type
    contentTypeDisplay = 'FILE';
  } else if (clip.content_type === 'link') {
    contentTypeDisplay = 'LINK';
  }

  const title = clip.title || (clip.preview_text ? clip.preview_text.substring(0, 50) + (clip.preview_text.length > 50 ? '...' : '') : 'Untitled Clip');
  const preview = clip.preview_text ? clip.preview_text.substring(0, 100) + (clip.preview_text.length > 100 ? '...' : '') : 'No preview available';


  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-2.5 border-b border-slate-200 dark:border-slate-700 transition-colors
                  ${isSelected 
                    ? 'bg-blue-500 text-white dark:bg-blue-600' 
                    : 'hover:bg-slate-100 dark:hover:bg-slate-700 focus-visible:bg-slate-100 dark:focus-visible:bg-slate-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500'
                  }
                  rounded-md mb-1`} // Added rounded-md and mb-1 for better separation
      role="option"
      aria-selected={isSelected}
      id={`clip-item-${clip.id}`}
    >
      <div className="flex items-center justify-between">
        <p className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>
          {title}
        </p>
        <span className={`text-xs px-1.5 py-0.5 rounded-sm 
                         ${isSelected 
                           ? 'bg-white/20 text-white' 
                           : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'}`}>
          {contentTypeDisplay}
        </span>
      </div>
      <p className={`mt-1 text-xs truncate ${isSelected ? 'text-blue-100 dark:text-blue-200' : 'text-slate-600 dark:text-slate-400'}`}>
        {preview}
      </p>
    </button>
  );
}
