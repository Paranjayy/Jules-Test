import React from 'react';

function FolderItem({ folder, isSelected, onSelect }) {
  return (
    <div
      className={`p-2 hover:bg-gray-200 cursor-pointer rounded-md ${isSelected ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-white text-gray-700'}`}
      onClick={() => onSelect(folder.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(folder.id); }} // Basic accessibility
      title={folder.name}
    >
      {folder.name}
    </div>
  );
}

export default FolderItem;
