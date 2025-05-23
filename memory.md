# OmniLaunch Development Log

## Phase 0: Project Setup & Foundation (2025-05-23)
- Initialized Git repository.
- Set up Electron, React, and Tailwind CSS.
- Created `OmniLaunch.md` for project documentation and `memory.md` for this changelog.
- Basic Electron application shell created.
- Documented initial concept for adaptable window and panels.

## Phase 1.1: Raycasty Base Layer (2025-05-23)
- Implemented core UI framework for panel management (`SinglePanelLayout`, `ThreePanelLayout`).
- Ensured adaptable/flexible window resizing using Tailwind CSS flexbox.
- Created a basic command input field (`CommandInput.js`).
- Implemented initial Escape key handling logic (clear input or close window via IPC).

## Phase 1.2: Clipboard Manager - Core Functionality Setup (2025-05-23)
- Defined database schema for clips, folders, and tags in `OmniLaunch.md`.
- Implemented background clipboard monitoring (`src/clipboard-monitor.js`):
    - Uses polling to detect changes in text and images.
    - Basic detection for links (URL regex). File detection is placeholder.
    - Captures `content_type`, `data`, `preview_text`, `timestamp`.
    - Logs detected clips to the console.
    - **Note on Source Application Detection:** The current implementation makes a best-effort attempt to read source application information (e.g., `clipboard.read('public.source')` on macOS). This is platform-dependent and may not be fully reliable or implemented for all platforms (e.g., Windows requires more complex solutions). Further work will be needed for robust, cross-platform source application identification.
- Integrated `ClipboardMonitor` into `src/main.js` (start/stop with app lifecycle).

## Phase 2.3: Advanced Metadata & Preview (Clipboard Manager Enhancements) - In Progress
- **Database & Metadata Enhancements**:
  - Added `last_edited_at` field to `clips` table in `src/database.js` and `OmniLaunch.md`.
  - Ensured `update-clip-title` IPC handler updates `last_edited_at`.
  - **Deferred:** LLM Tokenizer count for clips due to potential performance impact and complexity.
- **Preview Enhancements**: (Partially started)
- **Editable Previews**: (Partially started)
- **More Actions (`Cmd+K`)**: (Partially started)
