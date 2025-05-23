# IMPORTANT:
# Always read OmniLaunch.md before writing any code.
# After adding a major feature or completing a milestone, update OmniLaunch.md.
# Document the entire database schema in OmniLaunch.md.
# For new migrations, make sure to add them to the same file.

## Project Overview
OmniLaunch aims to be the ultimate command center for your desktop. It will start as a best-in-class clipboard manager and evolve into a versatile tool that integrates search, commands, automations, and information management into a single, elegant interface.

## Architecture
- Framework: Electron
- UI: React with Tailwind CSS
- State Management: (To be decided - e.g., Redux, Zustand)
- Backend/System Interaction: Node.js APIs within Electron

## Database Schema

The application will use SQLite for local data storage. The `better-sqlite3` library is recommended for synchronous database operations in the main process, or `sqlite3` for asynchronous operations if preferred.

**1. `clips` Table:** Stores individual clipboard items.
   - `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
   - `content_type` (TEXT NOT NULL CHECK(content_type IN ('text', 'image', 'file', 'link', 'color'))) - Type of the clipboard item.
   - `data` (BLOB or TEXT) - The actual content. For images, this could be base64 data. For files, it might be a path or identifier. For text/links/colors, it's the string.
   - `preview_text` (TEXT) - A searchable text representation of the content (e.g., the text itself, filename for files, URL for links).
   - `title` (TEXT) - User-editable title for the clip.
   - `source_app_name` (TEXT) - Name of the application from which the item was copied (best effort).
   - `source_app_icon` (TEXT) - Path or identifier for the source application's icon (best effort).
   - `folder_id` (INTEGER, FOREIGN KEY (`folders`.`id`) ON DELETE SET NULL) - Optional folder for organization.
   - `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)
   - `last_pasted_at` (DATETIME) - Timestamp of the last time the clip was pasted.
   - `times_pasted` (INTEGER DEFAULT 0) - Count of how many times the clip has been pasted.
   - `is_pinned` (BOOLEAN DEFAULT 0)
   - `metadata` (TEXT) - JSON string to store additional type-specific metadata (e.g., image dimensions, file size, word/char count for text). Example: `{"width": 100, "height": 50, "fileSize": 1024, "wordCount": 250}`

**2. `folders` Table:** Stores user-created folders.
   - `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
   - `name` (TEXT NOT NULL UNIQUE)
   - `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

**3. `tags` Table:** Stores user-created tags.
   - `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
   - `name` (TEXT NOT NULL UNIQUE)
   - `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

**4. `clip_tags` Table:** Many-to-many relationship between clips and tags.
   - `clip_id` (INTEGER, FOREIGN KEY (`clips`.`id`) ON DELETE CASCADE)
   - `tag_id` (INTEGER, FOREIGN KEY (`tags`.`id`) ON DELETE CASCADE)
   - PRIMARY KEY (`clip_id`, `tag_id`)

## Initial Concept for Adaptable Window and Panels
The application will support:
- Adaptable window sizing controlled by the user and potentially by content.
- Dynamic panel loading: The UI can switch between 1-panel (e.g., for commands), 2-panel, or 3-panel layouts (e.g., for the clipboard manager) based on the current feature or context. The core shell will manage the loading and display of these panel configurations.
