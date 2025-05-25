import React from 'react';
import { Input } from '@/components/ui/input'; // Assuming Shadcn Input

export default function OnePanelLayout({ commandValue, onCommandChange, onCommandSubmit }) {
  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      onCommandSubmit();
    }
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-background text-foreground p-4 pt-16 md:pt-24">
      <div className="w-full max-w-xl">
        {/* Content of OnePanelLayout, typically the command input */}
        <Input
          id="commandInput" // Keep ID for focus/Escape handling
          ref={(input) => input && input.focus()} // Auto-focus
          type="text"
          placeholder="Type a command or search..."
          value={commandValue}
          onChange={onCommandChange}
          onKeyPress={handleKeyPress}
          className="text-lg p-4"
        />
        {/* Placeholder for command suggestions or results below input */}
        <div className="mt-4 text-center">
          <p className="text-muted-foreground text-sm">
            {commandValue ? `Suggestions for: "${commandValue}"` : "OmniLaunch"}
          </p>
        </div>
      </div>
    </div>
  );
}
