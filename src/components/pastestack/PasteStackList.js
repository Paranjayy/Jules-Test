import React from 'react';
import PasteStackItem from './PasteStackItem';

function PasteStackList({ items, onRemoveItem, listFormat }) {
  if (!items || items.length === 0) {
    return <p className="p-3 text-sm text-gray-400">Paste stack is empty.</p>;
  }

  return (
    <div className="flex-grow overflow-y-auto border border-gray-700 rounded-md">
      {items.map((item, index) => (
        <PasteStackItem
          key={item.uniqueId || item.id} // Use uniqueId if available, else fallback to item.id
          item={item}
          index={index}
          onRemove={onRemoveItem}
          listFormat={listFormat}
        />
      ))}
    </div>
  );
}

export default PasteStackList;
