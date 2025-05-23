import React from 'react';
import StatusDisplay from './StatusDisplay';

function BottomBar({ 
  statusMessage, 
  selectedClipIds, 
  activeClip, 
  onRequestPaste, 
  onShowActionsPalette 
}) {
  
  const canPaste = activeClip && selectedClipIds && selectedClipIds.length === 1;

  const handlePasteClick = () => {
    if (canPaste) {
      onRequestPaste(activeClip.id);
    }
  };

  return (
    <div className="p-2 bg-gray-200 border-t border-gray-300 flex items-center justify-between sticky bottom-0 z-20">
      <div className="flex-grow">
        <StatusDisplay message={statusMessage} />
      </div>
      <div className="flex space-x-2">
        <button
          onClick={handlePasteClick}
          disabled={!canPaste}
          className={`px-3 py-1.5 text-xs font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 ${
            canPaste 
              ? 'bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-400' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Paste
        </button>
        <button
          onClick={onShowActionsPalette}
          className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500"
        >
          Actions (Cmd+K)
        </button>
      </div>
    </div>
  );
}

export default BottomBar;
