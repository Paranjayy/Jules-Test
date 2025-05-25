import React, { useState } from 'react';
import { Input } from '@/components/ui/input'; // Import Shadcn Input
import { Button } from '@/components/ui/button'; // Keep Button for testing interaction

export default function LauncherPage() {
  const [commandValue, setCommandValue] = useState('');

  const handleCommandChange = (event) => { // Corrected the arrow function syntax
    setCommandValue(event.target.value);
  };

  const handleCommandSubmit = () => {
    // For now, just log it. Later this will trigger command execution.
    console.log('Command submitted:', commandValue);
    // alert(`Command: ${commandValue}`); // Optional: for quick visual feedback
  };

  // Handle Enter key press on Input
  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleCommandSubmit();
    }
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-background text-foreground p-4 pt-16 md:pt-24">
      <div className="w-full max-w-xl"> {/* Container for command input and results */}
        <h1 className="text-3xl font-semibold text-center mb-8">
          OmniLaunch
        </h1>
        
        <Input
          type="text"
          id="commandInput" // Added id for potential focus management from Electron
          placeholder="Type a command or search..."
          value={commandValue}
          onChange={handleCommandChange}
          onKeyPress={handleKeyPress}
          className="text-lg p-4" // Larger text and padding for command input
        />

        {/* Placeholder for command suggestions or results */}
        <div className="mt-4 text-center">
          <p className="text-muted-foreground text-sm">
            {commandValue ? `Searching for: "${commandValue}"` : "Enter a command above."}
          </p>
        </div>

        {/* Example button to test styling and interaction */}
        <div className="mt-8 flex justify-center">
            <Button onClick={() => alert('Test Button Clicked!')}>Test Shadcn Button</Button>
        </div>
      </div>
    </div>
  );
}
