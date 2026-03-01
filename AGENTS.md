# AGENTS.md

This file contains guidelines for agentic coding assistants working on this repository.

## Project Overview

Localhost Scanner - A web app for developers to scan, manage, and launch localhost development servers. Built with Node.js/Express backend and React 18/Vite frontend.

## Build & Development Commands

### Root Commands
- `npm run dev` - Start both server (port 3001) and client (port 5173) concurrently
- `npm run server` - Start backend only
- `npm run client` - Start frontend only
- `npm run build` - Build the client for production
- `npm start` - Start production server

### Client Commands (run from `/client` directory)
- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

**Note:** This project does not have a test suite yet. When adding tests, add `npm test` scripts to package.json.

## Code Style Guidelines

### Server (Node.js/Express)

#### Imports
- Use ES modules (`import`/`export`)
- Group imports: standard library → third-party → local modules
- Named exports for modules, default export for main entry point
```javascript
import fs from 'fs';
import express from 'express';
import portScanner from './port-scanner.js';
export { app, server };
```

#### Functions & JSDoc
- Add JSDoc comments for all public functions
- Include @param, @returns tags with types
```javascript
/**
 * Kill a process by PID (cross-platform)
 * @param {number} pid - Process ID to kill
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function killProcess(pid) { ... }
```

#### Error Handling
- Use try/catch for async operations
- Return error objects or throw with descriptive messages
- Validate inputs at function entry
```javascript
if (!port || typeof port !== 'number' || port < 1 || port > 65535) {
  throw new Error('Invalid port number. Must be between 1 and 65535.');
}
```

#### Platform Detection
- Use `process.platform` for cross-platform code
- Handle 'win32', 'linux', 'darwin' explicitly
```javascript
const platform = process.platform;
if (platform === 'win32') {
  command = 'taskkill';
  args = ['/PID', pid.toString(), '/F'];
} else {
  command = 'kill';
  args = ['-9', pid.toString()];
}
```

### Client (React/Vite)

#### Components
- Use functional components with hooks
- PascalCase for component names
- Destructure props
```javascript
function PortCard({ port, onClose, onFavorite, onOpenFolder }) {
  const [isExpanded, setIsExpanded] = useState(false);
  ...
}
export default PortCard;
```

#### Hooks
- Custom hooks in `/client/src/hooks/` directory
- Name with `use` prefix
- Return object with state and methods
- Use useCallback for functions passed to dependencies
```javascript
export function usePortScanner(options = {}) {
  const [ports, setPorts] = useState([]);
  const scan = useCallback(() => { ... }, [deps]);
  return { ports, loading, scan };
}
export default usePortScanner;
```

#### Event Handlers
- Prefix with `handle` for component-internal handlers
- Prefix with `on` for props passed to child components
- Use optional chaining for callbacks: `onFavorite?.(port)`
- Stop propagation when needed: `e.stopPropagation()`

#### State Management
- Use useState for simple local state
- Use useCallback for functions to stabilize dependencies
- Use useRef for persistent values across renders
- Use useEffect for side effects with proper cleanup

### General Conventions

#### Naming
- **Variables/Functions:** camelCase (`portRanges`, `checkPort`)
- **Constants:** UPPER_SNAKE_CASE for module-level constants
- **Components/Types:** PascalCase (`PortCard`, `WebSocketServer`)
- **Files:** kebab-case for utilities, PascalCase for components
- **Directories:** kebab-case (`port-scanner.js`, `components/`)

#### API Routes
- RESTful conventions: GET/POST/PUT/DELETE
- Use Express router pattern
- Return consistent error format: `{ error: message }`
- All endpoints prefix with `/api/`

#### WebSocket Events
- Client→Server: action format (`scan:start`, `scan:stop`)
- Server→Client: data format (`ports:update`, `launch:log`)
- Broadcast to all clients for real-time updates

#### Configuration
- Settings stored in `config.json` at root
- Read/write via fs module on server
- Structure: `{ portRanges, scanInterval, favorites: { ports, folders } }`

## Project Structure

```
localhost_scanner/
├── server/              # Node.js/Express backend
│   ├── index.js         # Main server entry with WebSocket
│   ├── port-scanner.js  # Port scanning logic
│   ├── process-manager.js # Process detection & killing
│   └── favorites.js     # Favorites management (ports + folders)
├── client/              # React 18 frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── App.jsx      # Main application
│   │   └── *.css        # Component styles
│   └── vite.config.js   # Vite configuration
├── config.json          # User settings & favorites
└── package.json         # Root dependencies
```

## Important Notes

- Both server and client use ES modules (`"type": "module"` in package.json)
- Server runs on port 3001, client proxy to `/api` routes
- WebSocket endpoint: `ws://localhost:3001`
- Client dev server proxies `/api` to `http://localhost:3001`
- Platform-specific code handles Windows/Linux/Mac differences
- No test suite yet - add tests with appropriate test framework
