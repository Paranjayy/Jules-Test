import React from 'react';

// Helper to format date/time
const formatDateTime = (isoString) => {
  if (!isoString) return 'N/A';
  const date = new Date(isoString);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

// Helper to format bytes
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0 || bytes === undefined || bytes === null) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

function MetadataDisplay({ clip }) {
  if (!clip) return null;

  let parsedMetadata = {};
  if (typeof clip.metadata === 'string') {
    try {
      parsedMetadata = JSON.parse(clip.metadata);
    } catch (e) {
      console.error('Error parsing clip metadata JSON:', e);
    }
  } else if (typeof clip.metadata === 'object' && clip.metadata !== null) {
    // If metadata is already an object (e.g., from new-clip-added event)
    parsedMetadata = clip.metadata;
  }

  const commonFields = (
    <>
      <p><strong>Source:</strong> {clip.source_app_name || 'N/A'}</p>
      <p><strong>Content Type:</strong> {clip.content_type || 'N/A'}</p>
      <p><strong>Copied:</strong> {formatDateTime(clip.created_at)}</p>
      <p><strong>Last Pasted:</strong> {clip.last_pasted_at ? formatDateTime(clip.last_pasted_at) : 'Never'}</p>
      <p><strong>Times Pasted:</strong> {clip.times_pasted || 0}</p>
    </>
  );

  let typeSpecificFields;

  switch (clip.content_type) {
    case 'text':
      typeSpecificFields = (
        <>
          <p><strong>Characters:</strong> {parsedMetadata.charCount || 'N/A'}</p>
          <p><strong>Words:</strong> {parsedMetadata.wordCount || 'N/A'}</p>
          <p><strong>Lines:</strong> {parsedMetadata.lineCount || 'N/A'}</p>
        </>
      );
      break;
    case 'image':
      typeSpecificFields = (
        <>
          <p><strong>Dimensions:</strong> {parsedMetadata.width && parsedMetadata.height ? `${parsedMetadata.width} x ${parsedMetadata.height}` : 'N/A'}</p>
          {/* We don't store extension or original file size from clipboard image directly */}
          {/* <p><strong>Extension:</strong> {parsedMetadata.extension || 'N/A'}</p> */}
          {/* <p><strong>Size:</strong> {parsedMetadata.fileSize ? formatBytes(parsedMetadata.fileSize) : 'N/A'}</p> */}
        </>
      );
      break;
    case 'file': // Assuming future file support might provide more metadata
      typeSpecificFields = (
        <>
          <p><strong>Path:</strong> {parsedMetadata.path || 'N/A'}</p>
          {/* <p><strong>Extension:</strong> {parsedMetadata.extension || 'N/A'}</p> */}
          {/* <p><strong>Size:</strong> {parsedMetadata.fileSize ? formatBytes(parsedMetadata.fileSize) : 'N/A'}</p> */}
        </>
      );
      break;
    case 'link':
      typeSpecificFields = (
        <p><strong>URL:</strong> <a href={parsedMetadata.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{parsedMetadata.url}</a></p>
      );
      break;
    case 'color': // No specific metadata fields defined yet beyond the value itself
      typeSpecificFields = null;
      break;
    default:
      typeSpecificFields = <p>No specific metadata for this type.</p>;
  }

  return (
    <div className="my-3 p-3 text-xs text-gray-700 bg-gray-50 rounded-md max-h-60 overflow-y-auto">
      <h4 className="text-xs text-gray-500 uppercase mb-1">Details</h4>
      {commonFields}
      {typeSpecificFields}
    </div>
  );
}

export default MetadataDisplay;
