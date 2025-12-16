# NovaDev IDE

Professional web development environment powered by Monaco Editor (the same engine as VS Code).

## Features

### ✨ Core Features
- **Monaco Editor** - Full VS Code editing experience
- **Multi-file Support** - Create, edit, and manage unlimited files
- **Auto-save** - Projects automatically saved to localStorage
- **Syntax Highlighting** - Support for HTML, CSS, JavaScript, JSON, Markdown
- **IntelliSense** - Auto-completion and suggestions

### 🎨 Customization
- **Multiple Themes** - Dark, Light, High Contrast
- **Font Size** - Adjustable from 10px to 24px
- **Tab Size** - Configure indentation (2-8 spaces)
- **Word Wrap** - Toggle line wrapping
- **Minimap** - Code overview sidebar
- **Line Numbers** - Show/hide line numbers

### 🔧 Tools
- **File Explorer** - Tree view with create/delete operations
- **Search** - Find text across all files
- **Integrated Terminal** - Simulated bash terminal
- **Git Panel** - Initialize repo, commit changes (simulated)
- **Command Palette** - `Ctrl+Shift+P` for quick actions
- **Status Bar** - Line/column, language, encoding info

### ⌨️ Keyboard Shortcuts
- `Ctrl/Cmd + S` - Save project
- `Ctrl/Cmd + B` - Toggle sidebar
- `Ctrl/Cmd + Shift + P` - Command palette
- `Escape` - Close dialogs
- All standard Monaco shortcuts (find, replace, etc.)

### 📦 Export
- Export project as single HTML file
- Includes inline CSS and JavaScript
- Download and run anywhere

## Usage

### Creating Files
1. Click the `+` button in the Explorer
2. Enter filename with extension (e.g., `app.js`)
3. File opens automatically in editor

### Terminal Commands
- `help` - Show available commands
- `ls` - List files
- `cat <filename>` - Show file content
- `pwd` - Print working directory
- `clear` - Clear terminal
- `echo <text>` - Print message

### Settings
Click the gear icon in the activity bar to customize:
- Theme selection
- Font size
- Tab size
- Word wrap
- Minimap toggle
- Line numbers toggle

## Data Storage

Projects are saved to browser localStorage:
- **Key**: `novadev_ide_project_v1`
- **Settings Key**: `novadev_ide_settings_v1`
- **Storage Limit**: ~5-10MB (browser dependent)

⚠️ **Important**: Clearing browser data will delete your projects. Use the export feature to backup your work.

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## Future Enhancements

- [ ] Cloud sync with user accounts
- [ ] Real-time collaboration
- [ ] More language support (Python, TypeScript, etc.)
- [ ] Live preview pane
- [ ] Package manager integration
- [ ] Debugging tools
- [ ] Extension marketplace
- [ ] Import/export as ZIP
- [ ] GitHub integration

## Technology Stack

- **Monaco Editor** v0.44.0
- **Vanilla JavaScript** (no frameworks)
- **CSS Grid/Flexbox** for layout
- **localStorage API** for persistence

## License

Part of NovaDev Suite by David Munoz

---

**NovaDev Studio** - Building the future of web development tools
