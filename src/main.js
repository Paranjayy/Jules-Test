const { app, BrowserWindow, ipcMain, clipboard, nativeImage } = require('electron');
const path = require('path');
const ClipboardMonitor = require('./clipboard-monitor');
const { initializeDatabase, getDb } = require('./database');

let clipboardMonitor;

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // if you use a preload script
      contextIsolation: true,
      nodeIntegration: false, // Recommended for security
    }
  });

  // Load index.html (you'll create this for your React app)
  // For development, you might load from a dev server:
  // mainWindow.loadURL('http://localhost:3000'); 
  // For a production build:
  mainWindow.loadFile(path.join(__dirname, 'index.html')); // Load from src/index.html

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  initializeDatabase(app); // Initialize the database

  clipboardMonitor = new ClipboardMonitor();
  clipboardMonitor.start();

  // Example: Listen for new clips (optional for this phase, but good for testing)
  clipboardMonitor.on('new-clip-added', (clipWithId) => { // Changed from 'new-clip'
    console.log('Main process: new clip ADDED to DB:', clipWithId.id, clipWithId.content_type, clipWithId.preview_text.substring(0,50));
    // Notify renderer that clips have been updated
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
        focusedWindow.webContents.send('clips-updated');
    } else {
        // If no window is focused, send to all windows or the main window
        const allWindows = BrowserWindow.getAllWindows();
        if (allWindows.length > 0) {
            allWindows[0].webContents.send('clips-updated'); // Assuming first window is main
        }
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
      currentDb.prepare('UPDATE clips SET title = ? WHERE id = ?').run(newTitle, clipId);
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


  ipcMain.on('close-window', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      win.close();
    }
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
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
    currentDb.close(); // Close the database connection
    console.log('Database connection closed.');
  }
});
