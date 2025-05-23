import React from 'react';

function NewSnippetButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="ml-4 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-500"
      title="Create a new snippet"
    >
      + New Snippet
    </button>
  );
}

export default NewSnippetButton;
