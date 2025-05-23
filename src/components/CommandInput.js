import React from 'react';

function CommandInput({ value, onChange }) {
  return (
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder="Type a command..."
      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      id="commandInput" // Added id for focusing
    />
  );
}

export default CommandInput;
