import React from 'react';
import { marked } from 'marked'; // Import marked
import DOMPurify from 'dompurify'; // Import DOMPurify for sanitization

// Helper function to open links externally
const openExternalLink = (url) => {
  if (window.electron && window.electron.send) {
    window.electron.send('open-external-link', url);
  } else {
    // Fallback for environments where electron IPC is not available (e.g. web browser testing)
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

import React, { useState, useEffect } from 'react'; // Added useState, useEffect
import { marked } from 'marked'; 
import DOMPurify from 'dompurify'; 

// Helper function to open links externally
// ... (openExternalLink remains the same)

function PreviewArea({ clip, onClipContentUpdate }) { // Added onClipContentUpdate prop
  const [isEditingText, setIsEditingText] = useState(false);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    if (clip && clip.content_type === 'text') {
      setEditText(clip.data || ''); // Initialize editText when clip changes or is text type
    }
    setIsEditingText(false); // Reset editing state when clip changes
  }, [clip]);

  if (!clip || clip.data === undefined || clip.data === null) { // Check for undefined or null data
    return <div className="p-3 text-gray-500">No preview available. (Data might be missing)</div>;
  }
  
  const { id: clipId, content_type, data, title, metadata } = clip;

  let content;

  switch (content_type) {
    case 'text':
      // Basic check if content might be Markdown (e.g., contains #, *, -, etc.)
      // This is a very naive check; a more robust one or a metadata flag would be better.
      const mightBeMarkdown = /^(#+\s|\*\s|-\s|\[.*\]\(.*\)|`{1,3})/.test(data.substring(0, 200)); // Check start of text
      if (mightBeMarkdown) {
        const rawMarkup = marked.parse(data);
        const sanitizedHtml = DOMPurify.sanitize(rawMarkup);
        content = (
          <div 
            className="prose prose-sm max-w-none p-3 bg-gray-50 rounded-md max-h-60 overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        );
      } else { // Plain text, not Markdown
        if (isEditingText) {
          content = (
            <div className="p-1">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full h-40 p-2 border border-blue-500 rounded-md font-mono text-sm"
                autoFocus
              />
              <div className="mt-2 space-x-2">
                <button
                  onClick={async () => {
                    const updatedClip = await window.electron.invoke('update-clip-content', clipId, editText, 'text');
                    if (updatedClip && updatedClip.success) {
                      setIsEditingText(false);
                      if (onClipContentUpdate) onClipContentUpdate(updatedClip.clip); // Notify parent
                    } else {
                      console.error("Error updating clip content:", updatedClip.error);
                      // Handle error display if needed
                    }
                  }}
                  className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditingText(false);
                    setEditText(data); // Reset to original data
                  }}
                  className="px-3 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          );
        } else { // Displaying plain text
          content = (
            <div className="relative group">
              <pre className="whitespace-pre-wrap break-all text-sm p-3 bg-gray-50 rounded-md max-h-60 overflow-y-auto">
                {data}
              </pre>
              <button 
                onClick={() => setIsEditingText(true)}
                className="absolute top-1 right-1 px-1.5 py-0.5 text-xs bg-gray-200 text-gray-700 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-300 transition-opacity"
              >
                Edit
              </button>
            </div>
          );
        }
      }
      break;
    case 'image':
      content = (
        <img 
          src={data} 
          alt={title || 'Image preview'} 
          className="max-w-full h-auto max-h-80 object-contain rounded-md mx-auto" 
        />
      );
      break;
    case 'link':
      content = (
        <div className="p-3">
          <p className="text-sm text-gray-700 mb-1">Link:</p>
          <a
            href={data}
            onClick={(e) => { e.preventDefault(); openExternalLink(data); }}
            className="text-blue-600 hover:text-blue-800 hover:underline break-all"
            title={`Open link: ${data}`}
          >
            {data}
          </a>
        </div>
      );
      break;
    case 'color': // Assuming data is a hex/rgb string
      content = (
        <div className="p-3 flex flex-col items-center">
          <div 
            style={{ backgroundColor: data, width: '100px', height: '100px', borderRadius: '0.25rem', border: '1px solid #ccc' }} 
            title={`Color: ${data}`}
          />
          <p className="text-sm mt-2">{data}</p>
        </div>
      );
      break;
    case 'file': // Basic file display
      const fileName = title || (metadata && metadata.path ? metadata.path.split(/[/\\]/).pop() : 'File');
      content = (
        <div className="p-3 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-gray-700 mt-2 truncate">{fileName}</p>
          {metadata && metadata.path && <p className="text-xs text-gray-500 truncate">{metadata.path}</p>}
        </div>
      );
      break;
    default:
      content = <p className="p-3 text-gray-500">Unsupported content type for preview: {content_type}</p>;
  }

  return (
    <div className="my-3">
      <h4 className="text-xs text-gray-500 uppercase px-3 mb-1">Preview</h4>
      <div className="border border-gray-200 rounded-md p-2 bg-white">
        {content}
      </div>
    </div>
  );
}

export default PreviewArea;
