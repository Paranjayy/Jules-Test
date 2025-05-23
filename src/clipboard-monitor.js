const { clipboard, nativeImage } = require('electron'); // Added nativeImage
const EventEmitter = require('events');
const { getDb } = require('./database'); // To interact with the database

// Basic URL regex
const URL_REGEX = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

class ClipboardMonitor extends EventEmitter {
  constructor(pollingInterval = 1000) {
    super();
    this.pollingInterval = pollingInterval;
    this.lastText = clipboard.readText();
    this.lastImage = clipboard.readImage(); // NativeImage
    this.intervalId = null;
    this.isMonitoring = false;
  }

  checkForChanges() {
    if (!this.isMonitoring) return;

    let newClipData = null;
    const timestamp = new Date().toISOString();

    // 1. Check for text changes
    const currentText = clipboard.readText();
    if (currentText && currentText !== this.lastText) {
      this.lastText = currentText;
      this.lastImage = clipboard.readImage(); // Reset lastImage as text has priority

      let contentType = 'text';
      let previewText = currentText;

      if (URL_REGEX.test(currentText)) {
        contentType = 'link';
      }
      // Basic file path detection (very naive, for future improvement)
      // else if (currentText.startsWith('/') || /^[a-zA-Z]:\\/.test(currentText)) {
      //   contentType = 'file';
      //   previewText = '[File]: ' + currentText.split(/[/\\]/).pop();
      // }


      newClipData = {
        content_type: contentType,
        data: currentText,
        preview_text: previewText.substring(0, 100), // Max 100 chars for preview
        timestamp,
      };
    } else {
      // 2. If text hasn't changed, check for image changes
      const currentImage = clipboard.readImage();
      if (!currentImage.isEmpty() && (this.lastImage.isEmpty() || currentImage.toDataURL() !== this.lastImage.toDataURL())) {
        this.lastImage = currentImage;
        this.lastText = ''; // Clear last text if image is copied

        newClipData = {
          content_type: 'image',
          data: currentImage.toDataURL(), // Store as base64 Data URL
          preview_text: '[Image]',
          timestamp,
        };
      }
    }

    if (newClipData) {
      // Attempt to get source application (best effort)
      let sourceAppName = 'N/A';
      try {
        if (process.platform === 'darwin') {
          sourceAppName = clipboard.read('public.source') || 'N/A (macOS)';
        } else if (process.platform === 'win32') {
          sourceAppName = 'N/A (Windows - requires advanced implementation)';
        } else {
          sourceAppName = 'N/A (Linux)';
        }
      } catch (error) {
        console.warn('Could not read source application:', error.message);
        sourceAppName = 'N/A (Error reading source)';
      }
      newClipData.source_app_name = sourceAppName;

      // Save to database
      const db = getDb();
      if (db) {
        try {
          const stmt = db.prepare(`
            INSERT INTO clips (content_type, data, preview_text, title, source_app_name, created_at) 
            VALUES (?, ?, ?, ?, ?, ?)
          `);
          // For title, use preview_text for now or a generic title
          let title = newClipData.preview_text;
          let metadata = {};

          if (newClipData.content_type === 'text') {
            metadata = {
              charCount: newClipData.data.length,
              wordCount: newClipData.data.split(/\s+/).filter(Boolean).length,
              lineCount: newClipData.data.split(/\r\n|\r|\n/).length
            };
          } else if (newClipData.content_type === 'image') {
            title = 'Image Clip'; // Generic title for images
            const img = nativeImage.createFromDataURL(newClipData.data);
            const size = img.getSize();
            metadata = {
              width: size.width,
              height: size.height,
              // Could add format if known, e.g., from data URL type, though clipboard.readImage() gives NativeImage
              // fileSize: newClipData.data.length // This is base64 length, not original file size
            };
          } else if (newClipData.content_type === 'link') {
            title = newClipData.data; // Use the URL as title for links
            metadata = {
              url: newClipData.data
            };
          }
          // Add other types (file, color) metadata calculation here if supported

          const info = stmt.run(
            newClipData.content_type,
            newClipData.data, 
            newClipData.preview_text.substring(0, 255), 
            title.substring(0, 255), 
            newClipData.source_app_name,
            newClipData.timestamp,
            JSON.stringify(metadata) // Store metadata as JSON string
          );
          console.log('New Clip Saved to DB, ID:', info.lastInsertRowid, newClipData.content_type, metadata);
          this.emit('new-clip-added', { id: info.lastInsertRowid, ...newClipData, metadata }); // Include parsed metadata in emit
        } catch (err) {
          console.error('Error saving clip to database:', err);
        }
      } else {
        console.error('Database not available for saving clip.');
      }
      // Original emit for logging or other non-DB purposes can remain or be removed
      // this.emit('new-clip', newClipData); 
    }
  }

  start() {
    if (this.isMonitoring) {
      console.log('Clipboard monitor is already running.');
      return;
    }
    this.isMonitoring = true;
    // Initialize last known values before starting
    this.lastText = clipboard.readText();
    this.lastImage = clipboard.readImage();
    this.intervalId = setInterval(() => this.checkForChanges(), this.pollingInterval);
    console.log('Clipboard monitor started.');
  }

  stop() {
    if (!this.isMonitoring) {
      console.log('Clipboard monitor is not running.');
      return;
    }
    this.isMonitoring = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('Clipboard monitor stopped.');
  }
}

module.exports = ClipboardMonitor;
