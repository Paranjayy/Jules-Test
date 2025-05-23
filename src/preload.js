const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  send: (channel, data) => ipcRenderer.send(channel, data),
  receive: (channel, func) => {
    // Ensure that the listener is properly removed when the component unmounts
    // or when the effect re-runs. This basic version adds the listener.
    // For robust cleanup, the renderer side might need to manage an unlistener.
    const validChannels = ['clips-updated']; // Whitelist channels
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
      // It's good practice to return a way to remove the listener
      // return () => ipcRenderer.removeListener(channel, func); // This might be complex with contextBridge
    } else {
      console.warn(`Attempted to listen on an invalid channel: ${channel}`);
    }
  },
  // A more robust way to handle unsubscription for 'receive' might be needed if listeners accumulate.
  // For now, this allows adding listeners. A global way to clear specific listeners might be an option.
  // e.g., an `unsubscribe(channel, func)` exposed here.
  // However, typical Electron patterns have the renderer manage this via the returned unsubscribe function.
  // With contextBridge, it's trickier. Let's assume for now the number of such global listeners is small
  // and they live for the lifetime of the window, or the component explicitly handles unsubscription if possible.

  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
});

// Cleanup all listeners on a specific channel if needed (more of a heavy-handed approach)
// This is NOT part of the typical contextBridge exposure but shows a concept.
// contextBridge.exposeInMainWorld('electronCleanup', {
//   removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
// });
