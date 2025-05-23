import React from 'react';

function StatusDisplay({ message }) {
  return (
    <div className="text-xs text-gray-600 px-3 py-1.5 truncate" title={message}>
      {message || "Ready"}
    </div>
  );
}

export default StatusDisplay;
