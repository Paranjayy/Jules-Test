import React from 'react';

// Helper to generate a simple preview based on content type
const getPreviewText = (clip) => {
  if (clip.title && clip.title.trim() !== '') {
    return clip.title;
  }
  if (clip.preview_text && clip.preview_text.trim() !== '') {
    if (clip.content_type === 'image') return '[Image] ' + clip.preview_text.substring(0, 30) + '...';
    return clip.preview_text.substring(0, 50) + (clip.preview_text.length > 50 ? '...' : '');
  }
  if (clip.content_type === 'image') return '[Image Clip]';
  if (clip.content_type === 'link') return clip.data ? clip.data.substring(0, 50) + '...' : '[Link]';
  return 'Untitled Clip';
};

function PasteStackItem({ item, index, onRemove, listFormat }) {
  const previewContent = getPreviewText(item);

  return (
    <div 
      className="flex items-center justify-between p-2 border-b border-gray-700 hover:bg-gray-700"
      title={previewContent}
    >
      <div className="flex-grow flex items-center overflow-hidden">
        {listFormat === 'numbered' && <span className="mr-2 text-xs text-gray-400 w-5 text-right">{index + 1}.</span>}
        {listFormat === 'bullet' && <span className="mr-2 text-gray-400">&bull;</span>}
        <span className="text-sm truncate">{previewContent}</span>
      </div>
      <button
        onClick={() => onRemove(item.id, index)} // Pass index or a unique ID if items can have same db ID
        className="ml-2 px-2 py-0.5 text-xs text-red-400 hover:text-red-300 border border-red-400 hover:border-red-300 rounded"
        aria-label="Remove item from stack"
      >
        Remove
      </button>
    </div>
  );
}

export default PasteStackItem;
