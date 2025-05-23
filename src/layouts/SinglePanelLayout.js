import React from 'react';
import CommandInput from '../components/CommandInput';

function SinglePanelLayout({ commandValue, onCommandChange }) {
  return (
    <div className="flex flex-col h-screen p-4 bg-gray-100">
      <CommandInput value={commandValue} onChange={onCommandChange} />
      {/* Other single panel content can go here */}
      <div className="flex-grow mt-4 p-4 border border-gray-300 rounded-md bg-white">
        {/* This area is for the main content of the single panel */}
        <p>Single Panel Content Area</p>
      </div>
    </div>
  );
}

export default SinglePanelLayout;
