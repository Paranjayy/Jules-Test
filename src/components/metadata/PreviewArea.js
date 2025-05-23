import React from 'react';

// Helper function to open links externally
const openExternalLink = (url) => {
  if (window.electron && window.electron.send) {
    window.electron.send('open-external-link', url);
  } else {
    // Fallback for environments where electron IPC is not available (e.g. web browser testing)
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

function PreviewArea({ clip }) {
  if (!clip || !clip.data) {
    return <div className="p-3 text-gray-500">No preview available. (Data might be missing)</div>;
  }

  const { content_type, data, title, metadata } = clip;

  let content;

  switch (content_type) {
    case 'text':
      content = (
        <pre className="whitespace-pre-wrap break-all text-sm p-3 bg-gray-50 rounded-md max-h-60 overflow-y-auto">
          {data}
        </pre>
      );
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
