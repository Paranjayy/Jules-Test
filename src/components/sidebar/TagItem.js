import React from 'react';

function TagItem({ tag, isSelected, onSelect }) {
  return (
    <div
      className={`p-1.5 hover:bg-gray-200 cursor-pointer rounded-md text-xs ${isSelected ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-white text-gray-600'}`}
      onClick={() => onSelect(tag.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(tag.id); }}
      title={tag.name}
    >
      #{tag.name}
    </div>
  );
}

export default TagItem;
