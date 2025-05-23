import React from 'react';

// Helper to format date/time
const formatDateTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

// Helper to generate a simple preview based on content type
// Helper to generate a highlighted preview
const getHighlightedPreview = (text, searchTerm) => {
  if (!searchTerm || !text) return text;
  const parts = text.split(new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === searchTerm.toLowerCase() ? (
          <span key={index} className="bg-yellow-200">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
};


const getPreviewText = (clip) => {
  if (clip.title && clip.title.trim() !== '') {
    return clip.title;
  }
  if (clip.preview_text && clip.preview_text.trim() !== '') {
    if (clip.content_type === 'image') return '[Image] ' + clip.preview_text.substring(0, 50) + '...';
    return clip.preview_text.substring(0, 80) + (clip.preview_text.length > 80 ? '...' : '');
  }
  if (clip.content_type === 'image') return '[Image Clip]';
  if (clip.content_type === 'link') return clip.data ? clip.data.substring(0, 80) + '...' : '[Link]'; // clip.data might not be available here if not fetched
  return 'Untitled Clip';
};

function ClipItem({ clip, isSelected, onSelect, onCopy, onDragStart, searchTerm }) { // Added searchTerm prop
  const handleCopy = (e) => {
    e.stopPropagation(); 
    onCopy(clip.id);
  };

  const handleSelect = (e) => {
    onSelect(clip.id, clip, e.metaKey || e.ctrlKey, e.shiftKey);
  };
  
  const rawPreviewText = getPreviewText(clip);
  const displayPreview = searchTerm ? getHighlightedPreview(rawPreviewText, searchTerm) : rawPreviewText;
  const displayTitle = searchTerm ? getHighlightedPreview(clip.title || rawPreviewText, searchTerm) : (clip.title || rawPreviewText);


  return (
    <div
      className={`p-3 border-b border-gray-200 cursor-pointer ${isSelected ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-50'}`}
      onClick={handleSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelect(e); }}
      role="button"
      tabIndex={0}
      draggable="true"
      onDragStart={(e) => onDragStart(e, clip.id)}
      title={`${rawPreviewText}\nCreated: ${formatDateTime(clip.created_at)}\nSource: ${clip.source_app_name || 'N/A'}`}
    >
      <div className="flex justify-between items-center">
        <div className="flex-grow overflow-hidden mr-2">
          <p className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-gray-800'}`}>
            {clip.title ? displayTitle : displayPreview}
          </p>
          <p className={`text-xs truncate ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
            {clip.source_app_name || 'Unknown App'} - {formatDateTime(clip.created_at)}
          </p>
        </div>
        <button
          onClick={handleCopy}
          className={`px-2 py-1 text-xs rounded ${isSelected ? 'bg-blue-400 hover:bg-blue-300 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
          aria-label="Copy clip"
        >
          Copy
        </button>
      </div>
    </div>
  );
}

export default ClipItem;
