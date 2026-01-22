# NovaDev Suite - AI Coding Guidelines

## Architecture Overview
NovaDev Suite is a collection of web applications organized as:
- **Root SPA**: Vanilla JavaScript single-page application (`index.html`, `scripts/*.js`) serving as portfolio/homepage with sections for projects, blog, tools, contact
- **Embedded Apps**: Standalone applications in `/apps/` directory, each with own `index.html`
- **Game App**: `throttle-up/` is currently a vanilla JavaScript HTML5 Canvas game (TypeScript structure prepared for future 3D conversion)

## Key Patterns
- **Modular JavaScript**: Use ES6 imports/exports (e.g., `import { initUI } from './ui.js'`)
- **Data Persistence**: Use `localStorage` for user data (e.g., `localStorage.setItem('novadev_ide_project_v1', JSON.stringify(project))`)
- **Game Architecture**: Structured state management with phases, physics, rendering separation (see `core/game.ts`)
- **Canvas Rendering**: 2D games use HTML5 Canvas with separate renderer classes (e.g., `render/bikeRenderer2d.ts`)

## Development Workflows
- **Root App**: No build process - edit HTML/CSS/JS directly, serve static files
- **Throttle-Up Game**: Currently vanilla JS - edit directly; Vite setup prepared for future TypeScript/3D conversion
  - Planned: `npm run dev` for development server, `npm run build` for production build to `dist/`, `npm run preview` to test built version
  - Base path configured in `vite.config.ts` for deployment under `/novadev-suite/apps/throttle-up/`

## Code Examples
- **Game State Updates**: Follow the pattern in `core/game.ts` - separate physics, collision, visuals updates
- **Entity Management**: Use spawn controllers for dynamic objects (see `core/spawnController.ts`)
- **Rendering**: Implement renderer classes with `render(context, state)` methods (e.g., `render/bikeRenderer2d.ts`)

## File Organization
- `/scripts/` - Root app JavaScript modules
- `/apps/` - Standalone applications
- `/assets/` - Shared images/audio
- `/styles/` - CSS files
- Game-specific: `core/` for logic, `render/` for drawing, `assets/` for sprites

## Deployment
- Root app deploys as static site to Netlify/GitHub Pages/Vercel
- Individual apps deploy independently or as subdirectories
- Throttle-up currently deploys as static files; planned to build to `dist/` for static hosting when converted to TypeScript