import React from 'react';

export default function ThreePanelLayout({ leftPanel, middlePanel, rightPanel }) {
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Optional: A TopBar could go here later */}
      {/* <div className="h-12 border-b border-border flex items-center p-2">Top Bar Area</div> */}
      
      <div className="flex flex-grow overflow-hidden">
        <div className="w-1/4 border-r border-border p-4 overflow-y-auto">
          {leftPanel || <p>Left Panel</p>}
        </div>
        <div className="w-1/2 border-r border-border p-4 overflow-y-auto">
          {middlePanel || <p>Middle Panel</p>}
        </div>
        <div className="w-1/4 p-4 overflow-y-auto">
          {rightPanel || <p>Right Panel</p>}
        </div>
      </div>
      
      {/* Optional: A BottomBar could go here later */}
      {/* <div className="h-10 border-t border-border flex items-center p-2">Bottom Bar Area</div> */}
    </div>
  );
}
