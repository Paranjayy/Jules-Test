const { app, BrowserWindow, ipcMain, clipboard, nativeImage, globalShortcut } = require('electron');
const path = require('path');
const ClipboardMonitor = require('./clipboard-monitor');
const { initializeDatabase, getDb } = require('./database');

let clipboardMonitor;
let mainWindow; // Make mainWindow accessible
let pasteStackWindow = null; // Variable to hold the paste stack window instance

function createMainWindow () {
  mainWindow = new BrowserWindow({ // Assign to mainWindow
    width: 1000, // Increased width to accommodate three panels better
    height: 700, // Increased height
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // if you use a preload script
      contextIsolation: true,
      nodeIntegration: false, // Recommended for security
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html')); 

  // mainWindow.webContents.openDevTools(); // For main window
  
  mainWindow.on('closed', () => {
    mainWindow = null; // Dereference on close
  });
}

function createPasteStackWindow() {
  if (pasteStackWindow) {
    pasteStackWindow.focus();
    return;
  }

  pasteStackWindow = new BrowserWindow({
    width: 400,
    height: 500,
    alwaysOnTop: true,
    frame: true, // Show frame for now, can be false for custom title bar later
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Re-use existing preload for now
      nodeIntegration: false,
      contextIsolation: true,
    },
    // parent: mainWindow, // Optional: makes it a child window
    // modal: true, // Optional: makes it modal to mainWindow
    show: false, // Don't show immediately
  });

  // Load a new HTML file for the paste stack window
  pasteStackWindow.loadFile(path.join(__dirname, '../dist/pasteStack.html')); 
  // Note: The path should be relative to main.js in 'src', so if HTML is in 'dist', it's '../dist/pasteStack.html'
  // For development, if you serve HTML from src, it might be path.join(__dirname, 'pasteStack.html')

  pasteStackWindow.once('ready-to-show', () => {
    pasteStackWindow.show();
    // pasteStackWindow.webContents.openDevTools(); // For paste stack window
  });

  pasteStackWindow.on('closed', () => {
    pasteStackWindow = null;
  });
}


app.whenReady().then(() => {
  createMainWindow(); // Changed from createWindow
  initializeDatabase(app);

  clipboardMonitor = new ClipboardMonitor();
  clipboardMonitor.start();

  // Example: Listen for new clips (optional for this phase, but good for testing)
  clipboardMonitor.on('new-clip-added', (clipWithId) => { 
    console.log('Main process: new clip ADDED to DB:', clipWithId.id, clipWithId.content_type, clipWithId.preview_text.substring(0,50));
    
    // Notify main window renderer that clips have been updated
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('clips-updated');
    } else { // Fallback if mainWindow is not available or focusedWindow logic is preferred
        const mainRendererWindows = BrowserWindow.getAllWindows().filter(win => win !== pasteStackWindow);
        mainRendererWindows.forEach(win => win.webContents.send('clips-updated'));
    }

    // Send to Paste Stack window if it's open
    if (pasteStackWindow && pasteStackWindow.webContents) {
      // Consider adding a check here if paste stack is "active" or "not paused"
      // This might be managed by a state in the main process or an IPC message from paste stack window
      pasteStackWindow.webContents.send('add-to-paste-stack', clipWithId);
    }
  });

  // Folder Handlers
  ipcMain.handle('get-folders', async () => {
    const currentDb = getDb();
    if (!currentDb) {
      console.error('get-folders: Database not initialized');
      return [];
    }
    try {
      return currentDb.prepare('SELECT * FROM folders ORDER BY name ASC').all();
    } catch (err) {
      console.error('Error getting folders:', err);
      return [];
    }
  });

  ipcMain.handle('add-folder', async (event, name) => {
    const currentDb = getDb();
    if (!currentDb) {
      console.error('add-folder: Database not initialized');
      return null;
    }
    try {
      const stmt = currentDb.prepare('INSERT INTO folders (name) VALUES (?)');
      const info = stmt.run(name);
      return { id: info.lastInsertRowid, name, created_at: new Date().toISOString() }; // Return full object
    } catch (err) {
      console.error('Error adding folder:', err);
      return { error: err.message }; // Send error back to renderer
    }
  });

  // Tag Handlers
  ipcMain.handle('get-tags', async () => {
    const currentDb = getDb();
    if (!currentDb) {
      console.error('get-tags: Database not initialized');
      return [];
    }
    try {
      return currentDb.prepare('SELECT * FROM tags ORDER BY name ASC').all();
    } catch (err) {
      console.error('Error getting tags:', err);
      return [];
    }
  });

  ipcMain.handle('add-tag', async (event, name) => {
    const currentDb = getDb();
    if (!currentDb) {
      console.error('add-tag: Database not initialized');
      return null;
    }
    try {
      const stmt = currentDb.prepare('INSERT INTO tags (name) VALUES (?)');
      const info = stmt.run(name);
      return { id: info.lastInsertRowid, name, created_at: new Date().toISOString() }; // Return full object
    } catch (err) {
      console.error('Error adding tag:', err);
      return { error: err.message }; // Send error back to renderer
    }
  });

  // Clip Handlers
  ipcMain.handle('get-clips', async (event, folderId) => {
    const currentDb = getDb();
    if (!currentDb) {
      console.error('get-clips: Database not initialized');
      return [];
    }
    try {
      // Exclude 'data' for list view for performance, only fetch 'data' when needed (e.g. for copying or detail view)
      let query = 'SELECT id, content_type, preview_text, title, source_app_name, source_app_icon, created_at, last_pasted_at, times_pasted, is_pinned, folder_id, metadata FROM clips';
      const params = [];
      if (folderId && folderId !== 'all' && folderId !== 'inbox') { // Specific folder
        query += ' WHERE folder_id = ?';
        params.push(folderId);
      } else if (folderId === 'inbox' || folderId === null || folderId === undefined) { // 'Inbox' - clips with no folder
        query += ' WHERE folder_id IS NULL';
      }
      // If folderId is 'all', no WHERE clause for folder_id is added, fetching all clips.
      query += ' ORDER BY created_at DESC';
      return currentDb.prepare(query).all(...params);
    } catch (err) {
      console.error('Error getting clips:', err);
      return { error: err.message }; // Return error object
    }
  });

  ipcMain.handle('get-clip-data', async (event, clipId) => {
    const currentDb = getDb();
    if (!currentDb) return { error: 'Database not initialized' };
    try {
      const clip = currentDb.prepare('SELECT data, content_type FROM clips WHERE id = ?').get(clipId);
      if (!clip) return { error: 'Clip not found' };
      return clip;
    } catch (err) {
      console.error('Error getting clip data:', err);
      return { error: err.message };
    }
  });
  
  ipcMain.handle('copy-clip-to-system', async (event, clipId) => {
    const currentDb = getDb();
    if (!currentDb) return { success: false, error: 'Database not initialized' };
    try {
      const clip = currentDb.prepare('SELECT * FROM clips WHERE id = ?').get(clipId);
      if (!clip) return { success: false, error: 'Clip not found' };

      if (clip.content_type === 'text' || clip.content_type === 'link') {
        clipboard.writeText(clip.data);
      } else if (clip.content_type === 'image') {
        // Assuming clip.data for images is stored as a base64 DataURL
        const nativeImg = nativeImage.createFromDataURL(clip.data);
        clipboard.writeImage(nativeImg);
      } else {
        return { success: false, error: 'Unsupported clip type for copying' };
      }
      // Update last_pasted_at and times_pasted
      currentDb.prepare('UPDATE clips SET last_pasted_at = datetime(\'now\'), times_pasted = times_pasted + 1 WHERE id = ?').run(clipId);
      return { success: true };
    } catch (err) {
      console.error('Error copying clip to system:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('delete-clip', async (event, clipId) => {
    const currentDb = getDb();
    if (!currentDb) return { success: false, error: 'Database not initialized' };
    try {
      currentDb.prepare('DELETE FROM clips WHERE id = ?').run(clipId);
      // Notify renderer that clips have been updated after delete
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) focusedWindow.webContents.send('clips-updated');
      else BrowserWindow.getAllWindows().forEach(win => win.webContents.send('clips-updated'));
      return { success: true };
    } catch (err) {
      console.error('Error deleting clip:', err);
      return { success: false, error: err.message };
    }
  });
  
  ipcMain.handle('update-clip-folder', async (event, clipId, folderId) => {
    const currentDb = getDb();
    if (!currentDb) return { success: false, error: 'Database not initialized' };
    try {
      const targetFolderId = (folderId === 'none' || folderId === null || folderId === undefined) ? null : folderId;
      currentDb.prepare('UPDATE clips SET folder_id = ? WHERE id = ?').run(targetFolderId, clipId);
      // Notify renderer that clips have been updated after folder change
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) focusedWindow.webContents.send('clips-updated');
      else BrowserWindow.getAllWindows().forEach(win => win.webContents.send('clips-updated'));
      return { success: true };
    } catch (err) {
      console.error('Error updating clip folder:', err);
      return { success: false, error: err.message };
    }
  });

  });

  ipcMain.handle('update-clip-title', async (event, clipId, newTitle) => {
    const currentDb = getDb();
    if (!currentDb) return { success: false, error: 'Database not initialized' };
    try {
      currentDb.prepare('UPDATE clips SET title = ?, last_edited_at = datetime(\'now\') WHERE id = ?').run(newTitle, clipId);
      // Notify renderer that clip details might have changed (if title is shown in ClipsList)
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) focusedWindow.webContents.send('clips-updated'); 
      else BrowserWindow.getAllWindows().forEach(win => win.webContents.send('clips-updated'));
      return { success: true, newTitle };
    } catch (err) {
      console.error('Error updating clip title:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('get-clip-tags', async (event, clipId) => {
    const currentDb = getDb();
    if (!currentDb) {
      console.error('get-clip-tags: Database not initialized');
      return [];
    }
    try {
      return currentDb.prepare('SELECT t.id, t.name FROM tags t JOIN clip_tags ct ON t.id = ct.tag_id WHERE ct.clip_id = ? ORDER BY t.name ASC').all(clipId);
    } catch (err) {
      console.error('Error getting clip tags:', err);
      return { error: err.message }; // Return error object
    }
  });

  ipcMain.handle('add-tag-to-clip', async (event, clipId, tagName) => {
    const currentDb = getDb();
    if (!currentDb) return { success: false, error: 'Database not initialized' };
    try {
      // Find tag by tagName or create it
      let tag = currentDb.prepare('SELECT id FROM tags WHERE name = ?').get(tagName);
      let tagId;
      if (tag) {
        tagId = tag.id;
      } else {
        const info = currentDb.prepare('INSERT INTO tags (name) VALUES (?)').run(tagName);
        tagId = info.lastInsertRowid;
      }
      
      // Add to clip_tags, ignore if already exists
      currentDb.prepare('INSERT OR IGNORE INTO clip_tags (clip_id, tag_id) VALUES (?, ?)').run(clipId, tagId);
      
      // Notify renderer that clip details might have changed (if tags are shown)
      // This might be too broad, specific updates are better if possible.
      // For now, a general update is fine.
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) focusedWindow.webContents.send('clips-updated'); 
      else BrowserWindow.getAllWindows().forEach(win => win.webContents.send('clips-updated'));

      return { success: true, tag: { id: tagId, name: tagName } };
    } catch (err) {
      console.error('Error adding tag to clip:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('remove-tag-from-clip', async (event, clipId, tagId) => {
    const currentDb = getDb();
    if (!currentDb) return { success: false, error: 'Database not initialized' };
    try {
      currentDb.prepare('DELETE FROM clip_tags WHERE clip_id = ? AND tag_id = ?').run(clipId, tagId);
      // Notify renderer
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) focusedWindow.webContents.send('clips-updated');
      else BrowserWindow.getAllWindows().forEach(win => win.webContents.send('clips-updated'));
      return { success: true };
    } catch (err) {
      console.error('Error removing tag from clip:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.on('open-external-link', (event, url) => {
    const { shell } = require('electron');
    shell.openExternal(url);
  });

  ipcMain.handle('search-clips', async (event, searchTerm, searchScope, activeFolderId) => {
    const currentDb = getDb();
    if (!currentDb) {
      console.error('search-clips: Database not initialized');
      return { error: 'Database not initialized' };
    }
    if (!searchTerm || searchTerm.trim() === '') {
      // If search term is empty, effectively return clips as if no search was performed
      // This behavior might be refined based on UI needs (e.g., return all from scope or empty)
      // For now, let's mimic get-clips for the given scope.
      let query = 'SELECT id, content_type, preview_text, title, source_app_name, source_app_icon, created_at, last_pasted_at, times_pasted, is_pinned, folder_id, metadata FROM clips';
      const params = [];
      if (searchScope === 'activeFolder') {
        if (activeFolderId && activeFolderId !== 'all' && activeFolderId !== 'inbox') {
          query += ' WHERE folder_id = ?';
          params.push(activeFolderId);
        } else if (activeFolderId === 'inbox' || activeFolderId === null || activeFolderId === undefined) {
          query += ' WHERE folder_id IS NULL';
        }
      }
      query += ' ORDER BY created_at DESC';
      try {
        return currentDb.prepare(query).all(...params);
      } catch (err) {
        console.error('Error fetching clips for empty search:', err);
        return { error: err.message };
      }
    }

    try {
      let query = 'SELECT id, content_type, preview_text, title, source_app_name, source_app_icon, created_at, last_pasted_at, times_pasted, is_pinned, folder_id, metadata FROM clips';
      const params = [];
      const likeTerm = `%${searchTerm}%`;
      
      query += ' WHERE (title LIKE ? OR preview_text LIKE ?)';
      params.push(likeTerm, likeTerm);

      if (searchScope === 'activeFolder') {
        if (activeFolderId && activeFolderId !== 'all' && activeFolderId !== 'inbox') {
          query += ' AND folder_id = ?';
          params.push(activeFolderId);
        } else if (activeFolderId === 'inbox' || activeFolderId === null || activeFolderId === undefined) {
          // For 'inbox', folder_id should be NULL
          query += ' AND folder_id IS NULL';
        }
        // If activeFolderId is 'all' but scope is 'activeFolder', this is contradictory.
        // Assuming 'activeFolder' scope means we always filter by a folder (or inbox).
        // If activeFolderId is 'all' here, it implies search within all clips, which should be handled by searchScope 'all'.
        // For simplicity, if searchScope is 'activeFolder' and activeFolderId is 'all', it will fetch nothing due to `folder_id = 'all'` which is not a valid ID.
        // This logic should ideally be tightened or clarified based on exact UI behavior desired for "All Folders" selection.
      }
      // If searchScope is 'all', no additional folder_id filtering.
      
      query += ' ORDER BY created_at DESC';
      return currentDb.prepare(query).all(...params);
    } catch (err) {
      console.error('Error searching clips:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('add-manual-clip', async (event, clipData) => {
    const currentDb = getDb();
    if (!currentDb) return { success: false, error: 'Database not initialized' };

    const { title: userTitle, content_type, data, folder_id } = clipData;

    try {
      let actualData = data;
      let preview_text = '';
      let metadata = {};
      let finalTitle = userTitle || '';

      if (content_type === 'text') {
        actualData = data || ''; // Ensure data is not null
        preview_text = actualData.substring(0, 100);
        if (!finalTitle && actualData.trim() !== '') finalTitle = actualData.substring(0, 50) + (actualData.length > 50 ? '...' : '');
        else if (!finalTitle) finalTitle = "Untitled Text Clip";
        
        metadata = {
          charCount: actualData.length,
          wordCount: actualData.split(/\s+/).filter(Boolean).length,
          lineCount: actualData.split(/\r\n|\r|\n/).length
        };
      } else if (content_type === 'image') {
        // For manual image add, 'data' is expected to be a base64 dataURL already, or a path.
        // For simplicity, let's assume it's a dataURL for now if added manually via UI.
        // If it were a path, we'd need fs.readFile here.
        actualData = data; // Assuming data is DataURL
        preview_text = '[Image]';
        if (!finalTitle) finalTitle = "Untitled Image";
        const img = nativeImage.createFromDataURL(actualData); // Requires data to be a valid DataURL
        const size = img.getSize();
        metadata = {
          width: size.width,
          height: size.height,
        };
      } else if (content_type === 'link') {
        actualData = data || '';
        preview_text = actualData.substring(0,100);
        if(!finalTitle) finalTitle = actualData;
        metadata = { url: actualData };
      } else {
        return { success: false, error: 'Unsupported content type for manual add.' };
      }
      
      const timestamp = new Date().toISOString();
      // Source app name is not applicable for manually added clips or hard to determine.
      const source_app_name = 'OmniLaunch (Manual)';

      const stmt = currentDb.prepare(`
        INSERT INTO clips (content_type, data, preview_text, title, source_app_name, created_at, metadata, folder_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        content_type,
        actualData,
        preview_text,
        finalTitle,
        source_app_name,
        timestamp,
        JSON.stringify(metadata),
        folder_id === 'inbox' || folder_id === 'none' ? null : folder_id
      );

      const newClip = {
        id: info.lastInsertRowid,
        content_type,
        data: actualData, // Or a placeholder if data is too large
        preview_text,
        title: finalTitle,
        source_app_name,
        created_at: timestamp,
        metadata,
        folder_id: folder_id === 'inbox' || folder_id === 'none' ? null : folder_id,
        is_pinned: 0,
        last_pasted_at: null,
        times_pasted: 0
      };
      
      // Notify renderer
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) focusedWindow.webContents.send('clips-updated');
      else BrowserWindow.getAllWindows().forEach(win => win.webContents.send('clips-updated'));

      return { success: true, clip: newClip };

    } catch (err) {
      console.error('Error adding manual clip:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('paste-clip', async (event, clipId) => {
    const currentDb = getDb();
    if (!currentDb) return { success: false, error: 'Database not initialized' };
    try {
      const clip = currentDb.prepare('SELECT data, content_type FROM clips WHERE id = ?').get(clipId);
      if (!clip) return { success: false, error: 'Clip not found' };

      if (clip.content_type === 'text' || clip.content_type === 'link') {
        clipboard.writeText(clip.data);
      } else if (clip.content_type === 'image') {
        const nativeImg = nativeImage.createFromDataURL(clip.data);
        clipboard.writeImage(nativeImg);
      } else {
        return { success: false, error: 'Unsupported clip type for pasting' };
      }

      // Simulate Ctrl/Cmd+V
      const robot = require('robotjs');
      // Hide the main window before pasting to ensure the correct app is targeted
      const focusedWin = BrowserWindow.getFocusedWindow();
      if (focusedWin && focusedWin.isVisible()) { // Check if it's our window
        focusedWin.hide(); // Or minimize, depending on desired UX
        // Give a slight delay for the window to hide and OS to switch focus
        await new Promise(resolve => setTimeout(resolve, 200)); 
      }
      
      robot.keyTap('v', process.platform === 'darwin' ? 'command' : 'control');
      
      // Optional: Bring the window back after pasting
      // if (focusedWin) {
      //    await new Promise(resolve => setTimeout(resolve, 100)); // Delay before showing again
      //    focusedWin.show();
      // }


      currentDb.prepare('UPDATE clips SET last_pasted_at = datetime(\'now\'), times_pasted = times_pasted + 1 WHERE id = ?').run(clipId);
      return { success: true };
    } catch (err) {
      console.error('Error pasting clip:', err);
      // Attempt to show window again if it was hidden and an error occurred
      const focusedWin = BrowserWindow.getFocusedWindow();
      if (focusedWin && !focusedWin.isVisible()) focusedWin.show();
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('toggle-pin-clip', async (event, clipId) => {
    const currentDb = getDb();
    if (!currentDb) return { success: false, error: 'Database not initialized' };
    try {
      const currentClip = currentDb.prepare('SELECT is_pinned FROM clips WHERE id = ?').get(clipId);
      if (!currentClip) return { success: false, error: 'Clip not found' };
      
      const newPinnedState = !currentClip.is_pinned;
      currentDb.prepare('UPDATE clips SET is_pinned = ? WHERE id = ?').run(newPinnedState ? 1 : 0, clipId);

      // Notify renderer that clips have been updated
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) focusedWindow.webContents.send('clips-updated');
      else BrowserWindow.getAllWindows().forEach(win => win.webContents.send('clips-updated'));

      return { success: true, newPinnedState };
    } catch (err) {
      console.error('Error toggling pin state:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('paste-stack-item-sequentially', async (event, clipData) => {
    // This handler is specifically for the paste stack to paste items without
    // affecting the main OmniLaunch window visibility or focus as much as 'paste-clip' might.
    // It also doesn't update last_pasted_at or times_pasted for the original clip,
    // as this is a stack paste, not a direct paste of an original clip.
    if (!clipData || clipData.data === undefined || clipData.content_type === undefined) {
      return { success: false, error: 'Invalid clip data provided for sequential paste.' };
    }
    
    try {
      if (clipData.content_type === 'text' || clipData.content_type === 'link') {
        clipboard.writeText(clipData.data);
      } else if (clipData.content_type === 'image') {
        const nativeImg = nativeImage.createFromDataURL(clipData.data);
        clipboard.writeImage(nativeImg);
      } else {
        return { success: false, error: 'Unsupported clip type for sequential paste' };
      }

      // Simulate Ctrl/Cmd+V
      const robot = require('robotjs');
      // For sequential paste, we assume the user has focused the target application.
      // We avoid hiding any OmniLaunch windows here.
      robot.keyTap('v', process.platform === 'darwin' ? 'command' : 'control');
      
      return { success: true };
    } catch (err) {
      console.error('Error in paste-stack-item-sequentially:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('save-paste-stack-history', async (event, items, runName) => {
    const currentDb = getDb();
    if (!currentDb) return { success: false, error: 'Database not initialized' };
    if (!items || items.length === 0) return { success: true, message: 'No items to save.' }; // Not an error

    try {
      // Begin a transaction
      currentDb.exec('BEGIN');

      const runStmt = currentDb.prepare('INSERT INTO paste_stack_runs (name, created_at) VALUES (?, datetime(\'now\'))');
      const runInfo = runStmt.run(runName || null); // Allow optional run name
      const runId = runInfo.lastInsertRowid;

      const itemStmt = currentDb.prepare('INSERT INTO paste_stack_run_items (run_id, clip_id, sequence_order) VALUES (?, ?, ?)');
      for (let i = 0; i < items.length; i++) {
        // items are expected to be full clip objects, we only need the original clip_id (item.id from 'clips' table)
        // The stack items are typically in reverse chronological order (newest at top)
        // If we want to preserve this visual order as sequence_order, we can use i directly.
        // Or if items array is already in desired sequence order from client.
        itemStmt.run(runId, items[i].id, i); 
      }

      currentDb.exec('COMMIT');
      return { success: true, runId };
    } catch (err) {
      if (currentDb.inTransaction) {
        currentDb.exec('ROLLBACK');
      }
      console.error('Error saving paste stack history:', err);
      return { success: false, error: err.message };
    }
  });

  // Snippet Folder Handlers
  ipcMain.handle('get-snippet-folders', async () => {
    const currentDb = getDb();
    if (!currentDb) return { error: 'Database not initialized' };
    try {
      return currentDb.prepare('SELECT * FROM snippet_folders ORDER BY name ASC').all();
    } catch (err) {
      console.error('Error getting snippet folders:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('add-snippet-folder', async (event, name) => {
    const currentDb = getDb();
    if (!currentDb) return { error: 'Database not initialized' };
    try {
      const info = currentDb.prepare('INSERT INTO snippet_folders (name) VALUES (?)').run(name);
      return { success: true, id: info.lastInsertRowid, name };
    } catch (err) {
      console.error('Error adding snippet folder:', err);
      return { error: err.message };
    }
  });

  // Snippet Handlers
  ipcMain.handle('get-snippets', async (event, folderId) => {
    const currentDb = getDb();
    if (!currentDb) return { error: 'Database not initialized' };
    try {
      let query = 'SELECT * FROM snippets';
      const params = [];
      if (folderId && folderId !== 'all' && folderId !== 'inbox') { // 'inbox' might mean no folder
        query += ' WHERE folder_id = ?';
        params.push(folderId);
      } else if (folderId === 'inbox' || folderId === null || folderId === undefined) {
        query += ' WHERE folder_id IS NULL';
      }
      query += ' ORDER BY title ASC';
      return currentDb.prepare(query).all(...params);
    } catch (err) {
      console.error('Error getting snippets:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('add-snippet', async (event, snippetData) => {
    const currentDb = getDb();
    if (!currentDb) return { error: 'Database not initialized' };
    const { title, content, folder_id, keyword } = snippetData;
    try {
      const stmt = currentDb.prepare(
        'INSERT INTO snippets (title, content, folder_id, keyword, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))'
      );
      const targetFolderId = (folder_id === 'inbox' || folder_id === 'none' || folder_id === undefined) ? null : folder_id;
      const info = stmt.run(title, content, targetFolderId, keyword || null);
      // Notify main window renderer that snippets have been updated
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('snippets-updated');
      }
      return { success: true, id: info.lastInsertRowid };
    } catch (err) {
      console.error('Error adding snippet:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('update-snippet', async (event, snippetId, snippetData) => {
    const currentDb = getDb();
    if (!currentDb) return { error: 'Database not initialized' };
    const { title, content, folder_id, keyword } = snippetData;
    try {
      const targetFolderId = (folder_id === 'inbox' || folder_id === 'none' || folder_id === undefined) ? null : folder_id;
      currentDb.prepare(
        'UPDATE snippets SET title = ?, content = ?, folder_id = ?, keyword = ? WHERE id = ?'
      ).run(title, content, targetFolderId, keyword || null, snippetId);
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('snippets-updated');
      }
      return { success: true };
    } catch (err) {
      console.error('Error updating snippet:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('delete-snippet', async (event, snippetId) => {
    const currentDb = getDb();
    if (!currentDb) return { error: 'Database not initialized' };
    try {
      currentDb.prepare('DELETE FROM snippets WHERE id = ?').run(snippetId);
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('snippets-updated');
      }
      return { success: true };
    } catch (err) {
      console.error('Error deleting snippet:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('get-snippet-by-id', async (event, snippetId) => {
    const currentDb = getDb();
    if (!currentDb) return { error: 'Database not initialized' };
    try {
      return currentDb.prepare('SELECT * FROM snippets WHERE id = ?').get(snippetId);
    } catch (err) {
      console.error('Error getting snippet by ID:', err);
      return { error: err.message };
    }
  });
  
  ipcMain.handle('paste-snippet-content', async (event, snippetId) => {
    const currentDb = getDb();
    if (!currentDb) return { success: false, error: 'Database not initialized' };
    try {
      const snippet = currentDb.prepare('SELECT * FROM snippets WHERE id = ?').get(snippetId);
      if (!snippet) return { success: false, error: 'Snippet not found' };

      let processedContent = snippet.content;
      // Replace placeholders
      processedContent = processedContent.replace(/{clipboard}/g, clipboard.readText());
      processedContent = processedContent.replace(/{date}/g, new Date().toLocaleDateString());
      processedContent = processedContent.replace(/{time}/g, new Date().toLocaleTimeString());
      processedContent = processedContent.replace(/{cursor}/g, ''); // Remove {cursor} for now

      clipboard.writeText(processedContent);

      const robot = require('robotjs');
      const focusedWin = BrowserWindow.getFocusedWindow();
      if (focusedWin && focusedWin.isVisible() && focusedWin !== pasteStackWindow && focusedWin !== mainWindow) {
        // If an external window is focused, just paste.
      } else if (mainWindow && mainWindow.isVisible()) {
         // If our main window is focused or no specific external window, hide main before paste.
         // This logic might need refinement depending on which window should be hidden.
         // For snippets, we usually want to paste into another app.
         mainWindow.hide();
         await new Promise(resolve => setTimeout(resolve, 200)); // Delay for focus switch
      }
      // If pasteStackWindow is focused, we probably don't want to hide it.
      // The current logic above focuses on hiding mainWindow if it's the one in foreground.

      robot.keyTap('v', process.platform === 'darwin' ? 'command' : 'control');
      
      // Update usage stats
      currentDb.prepare(
        'UPDATE snippets SET last_used_at = datetime(\'now\'), times_used = times_used + 1 WHERE id = ?'
      ).run(snippetId);
      
      // Optionally, bring mainWindow back if it was hidden
      // if (mainWindow && !mainWindow.isVisible() && !pasteStackWindow) mainWindow.show();

      return { success: true };
    } catch (err) {
      console.error('Error pasting snippet content:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('search-snippets', async (event, searchTerm, folderId) => {
    const currentDb = getDb();
    if (!currentDb) return { error: 'Database not initialized' };
    
    try {
      let query = `
        SELECT * FROM snippets 
        WHERE (title LIKE ? OR content LIKE ? OR keyword LIKE ?)
      `;
      const params = [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`];

      if (folderId && folderId !== 'all' && folderId !== 'inbox') {
        query += ' AND folder_id = ?';
        params.push(folderId);
      } else if (folderId === 'inbox' || folderId === null || folderId === undefined) {
        query += ' AND folder_id IS NULL';
      }
      // If folderId is 'all', no additional folder_id filtering.

      query += ' ORDER BY title ASC';
      return currentDb.prepare(query).all(...params);
    } catch (err) {
      console.error('Error searching snippets:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('update-clip-content', async (event, clipId, newContent, newContentType) => {
    const currentDb = getDb();
    if (!currentDb) return { success: false, error: 'Database not initialized' };
    try {
      let content = newContent;
      let contentType = newContentType; // If not provided, keep existing or default to 'text'
      
      const existingClip = currentDb.prepare('SELECT content_type FROM clips WHERE id = ?').get(clipId);
      if (!existingClip) return { success: false, error: 'Clip not found' };

      if (!contentType) {
        contentType = existingClip.content_type; // Use existing if not changing type
      }

      let preview_text = '';
      let metadata = {};

      if (contentType === 'text' || contentType === 'link') {
        preview_text = content.substring(0, 100); // Keep preview short
        metadata = {
          charCount: content.length,
          wordCount: content.split(/\s+/).filter(Boolean).length,
          lineCount: content.split(/\r\n|\r|\n/).length
        };
        if (contentType === 'link') {
          metadata.url = content;
        }
      } else if (contentType === 'image') {
        // For images, newContent would be a new dataURL.
        // Preview text might be just "[Image]" or derived from a new title if that's also updated.
        preview_text = '[Image]'; 
        const img = nativeImage.createFromDataURL(content);
        const size = img.getSize();
        metadata = {
          width: size.width,
          height: size.height,
        };
      } else {
        // For other types, generate a generic preview or handle as needed
        preview_text = `[${contentType}]`;
      }

      currentDb.prepare(
        'UPDATE clips SET data = ?, content_type = ?, preview_text = ?, metadata = ?, last_edited_at = datetime(\'now\') WHERE id = ?'
      ).run(content, contentType, preview_text, JSON.stringify(metadata), clipId);
      
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('clips-updated');
      }
      // Fetch the updated clip to return it, including any generated fields like last_edited_at
      const updatedClip = currentDb.prepare('SELECT * FROM clips WHERE id = ?').get(clipId);
      return { success: true, clip: updatedClip };
    } catch (err) {
      console.error('Error updating clip content:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('save-clip-as-file', async (event, clipId) => {
    const currentDb = getDb();
    if (!currentDb) return { success: false, error: 'Database not initialized' };
    
    const clip = currentDb.prepare('SELECT data, content_type, title FROM clips WHERE id = ?').get(clipId);
    if (!clip) return { success: false, error: 'Clip not found' };

    const defaultPath = clip.title ? clip.title.replace(/[/\\?%*:|"<>]/g, '-') : 'clip'; // Sanitize title for filename
    let extension = '.txt';
    if (clip.content_type === 'image') extension = '.png'; // Assuming data is PNG dataURL
    else if (clip.content_type === 'link') extension = '.url'; // Windows URL file
    // Add more types as needed

    const { dialog } = require('electron');
    const dialogResult = await dialog.showSaveDialog(mainWindow, { // Pass mainWindow to parent dialog
      defaultPath: `${defaultPath}${extension}`,
      filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'PNG Images', extensions: ['png'] },
        { name: 'URL Files', extensions: ['url'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (dialogResult.canceled || !dialogResult.filePath) {
      return { success: false, canceled: true };
    }

    try {
      let dataToSave = clip.data;
      if (clip.content_type === 'image') {
        // Assuming clip.data is a DataURL (e.g., "data:image/png;base64,iVBORw0KGgo...")
        // Need to convert DataURL to Buffer
        const dataUrlParts = clip.data.split(',');
        if (dataUrlParts.length < 2) throw new Error('Invalid image dataURL format');
        dataToSave = Buffer.from(dataUrlParts[1], 'base64');
      } else if (clip.content_type === 'link' && dialogResult.filePath.endsWith('.url')) {
        // Create content for a .url file
        dataToSave = `[InternetShortcut]\r\nURL=${clip.data}\r\n`;
      }
      // For text, clip.data is already a string

      const fs = require('fs');
      fs.writeFileSync(dialogResult.filePath, dataToSave);
      return { success: true, filePath: dialogResult.filePath };
    } catch (err) {
      console.error('Error saving clip as file:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('append-to-clipboard', async (event, clipId) => {
    const currentDb = getDb();
    if (!currentDb) return { success: false, error: 'Database not initialized' };
    
    const clip = currentDb.prepare('SELECT data, content_type FROM clips WHERE id = ?').get(clipId);
    if (!clip) return { success: false, error: 'Clip not found' };

    if (clip.content_type === 'text' || clip.content_type === 'link') {
      const currentClipboardText = clipboard.readText();
      clipboard.writeText(currentClipboardText + clip.data);
      return { success: true };
    } else if (clip.content_type === 'image') {
      // Appending images is more complex and platform-dependent.
      // Could potentially save current clipboard image and new image to temp files,
      // merge them using a library, then write back.
      // For now, return not supported for images.
      return { success: false, error: 'Appending images not supported yet.' };
    }
    return { success: false, error: 'Unsupported content type for appending.' };
  });

  ipcMain.handle('paste-clip-no-hide', async (event, clipId) => {
    const currentDb = getDb();
    if (!currentDb) return { success: false, error: 'Database not initialized' };
    try {
      const clip = currentDb.prepare('SELECT data, content_type FROM clips WHERE id = ?').get(clipId);
      if (!clip) return { success: false, error: 'Clip not found' };

      if (clip.content_type === 'text' || clip.content_type === 'link') {
        clipboard.writeText(clip.data);
      } else if (clip.content_type === 'image') {
        const nativeImg = nativeImage.createFromDataURL(clip.data);
        clipboard.writeImage(nativeImg);
      } else {
        return { success: false, error: 'Unsupported clip type for pasting' };
      }

      // Simulate Ctrl/Cmd+V
      const robot = require('robotjs');
      // Unlike 'paste-clip', this handler does NOT hide the OmniLaunch window.
      robot.keyTap('v', process.platform === 'darwin' ? 'command' : 'control');
      
      currentDb.prepare('UPDATE clips SET last_pasted_at = datetime(\'now\'), times_pasted = times_pasted + 1 WHERE id = ?').run(clipId);
      return { success: true };
    } catch (err) {
      console.error('Error in paste-clip-no-hide:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('delete-all-clips-in-scope', async (event, scope, folderId) => {
    const currentDb = getDb();
    if (!currentDb) return { success: false, error: 'Database not initialized' };
    
    try {
      let query = 'DELETE FROM clips';
      const params = [];

      if (scope === 'activeFolder') {
        if (folderId && folderId !== 'all' && folderId !== 'inbox') {
          query += ' WHERE folder_id = ?';
          params.push(folderId);
        } else if (folderId === 'inbox' || folderId === null || folderId === undefined) {
          query += ' WHERE folder_id IS NULL';
        } else { // folderId is 'all', but scope is 'activeFolder' - this means delete ALL clips.
                 // This case should ideally be confirmed by a more specific scope like 'allClips'.
                 // For safety, if scope is 'activeFolder' and folderId is 'all', we do nothing or return error.
          console.warn("Attempted 'Delete All in Folder' with 'All Folders' selected. Aborting for safety. Use 'Delete All Clips' scope.");
          return { success: false, error: "Cannot delete all clips when scoped to 'Active Folder' and 'All Folders' is selected. Use a specific 'Delete All Clips' action."};
        }
      } else if (scope === 'allClips') {
        // No WHERE clause, deletes all clips. This is dangerous and should be confirmed heavily.
      } else {
        return { success: false, error: 'Invalid scope for deleting clips.' };
      }
      
      // Make sure there's a WHERE clause if we are not explicitly deleting ALL clips.
      // This is a safeguard.
      if (scope !== 'allClips' && !query.includes('WHERE')) {
          return { success: false, error: 'Deletion query is unsafe (no WHERE clause for scoped delete).' };
      }

      const result = currentDb.prepare(query).run(...params);
      
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('clips-updated');
      }
      return { success: true, affectedRows: result.changes };
    } catch (err) {
      console.error('Error deleting all clips in scope:', err);
      return { success: false, error: err.message };
    }
  });


  ipcMain.on('close-window', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      win.close();
    }
  });

  // Global shortcut for Paste Stack
  // Make this configurable later
  const ret = globalShortcut.register('CommandOrControl+Shift+V', () => {
    console.log('CommandOrControl+Shift+V is pressed');
    createPasteStackWindow();
  });

  if (!ret) {
    console.error('Failed to register global shortcut CommandOrControl+Shift+V');
  } else {
    console.log('Global shortcut CommandOrControl+Shift+V registered successfully.');
  }

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow(); // Changed from createWindow
    } else if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (clipboardMonitor) {
    clipboardMonitor.stop();
  }
  const currentDb = getDb();
  if (currentDb) {
    currentDb.close(); 
    console.log('Database connection closed.');
  }
  globalShortcut.unregisterAll(); // Unregister all shortcuts
  console.log('Global shortcuts unregistered.');
});
