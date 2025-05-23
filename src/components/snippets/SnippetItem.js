import React from 'react';

function SnippetItem({ snippet, isSelected, onSelect, searchTerm }) {
  
  const getHighlightedText = (text, highlight) => {
    if (!highlight || !text) return text;
    const parts = text.split(new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
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

  const titleDisplay = getHighlightedText(snippet.title, searchTerm);
  // For content preview, show a snippet of the content, also highlighted
  const contentPreviewText = snippet.content.substring(0, 100) + (snippet.content.length > 100 ? '...' : '');
  const contentDisplay = getHighlightedText(contentPreviewText, searchTerm);


  return (
    <div
      className={`p-3 border-b border-gray-200 cursor-pointer ${isSelected ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-50'}`}
      onClick={() => onSelect(snippet)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(snippet); }}
      role="button"
      tabIndex={0} // Make it focusable
      title={snippet.title}
    >
      <h4 className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-gray-800'}`}>
        {titleDisplay}
      </h4>
      <p className={`text-xs truncate ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
        {contentDisplay}
      </p>
      {snippet.keyword && (
        <p className={`text-xs mt-1 ${isSelected ? 'text-blue-200' : 'text-purple-600'}`}>
          Keyword: <span className="font-mono bg-gray-200 px-1 rounded">{getHighlightedText(snippet.keyword, searchTerm)}</span>
        </p>
      )}
    </div>
  );
}

export default SnippetItem;
