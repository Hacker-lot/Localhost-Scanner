import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

import portScanner from './port-scanner.js';
import processManager from './process-manager.js';
import favoritesManager from './favorites.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3001;
const CONFIG_PATH = join(rootDir, 'config.json');

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(rootDir, 'client', 'dist')));
}

// Load config
let config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));

// WebSocket connections
const clients = new Set();

// WebSocket server error handling
wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

wss.on('connection', (ws, req) => {
  clients.add(ws);
  console.log('✅ WebSocket client connected from:', req.socket.remoteAddress);
  console.log('Total clients:', clients.size);

  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client disconnected');
  });

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📨 Received message:', data.type);
      
      switch (data.type) {
        case 'scan:start':
          await performScan();
          break;
        case 'scan:stop':
          // Stop auto-scan (handled by client)
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
});

// Broadcast to all WebSocket clients
function broadcast(type, data) {
  const message = JSON.stringify({ type, data });
  clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  });
}

// Perform port scan and broadcast results
async function performScan() {
  try {
    const results = await portScanner.scan(config.portRanges);
    broadcast('ports:update', results);
  } catch (error) {
    console.error('Scan error:', error);
    broadcast('scan:error', { message: error.message });
  }
}

// API Routes

// Get all open ports
app.get('/api/ports', async (req, res) => {
  try {
    const results = await portScanner.scan(config.portRanges);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Kill process by PID
app.post('/api/ports/:pid/kill', async (req, res) => {
  try {
    const { pid } = req.params;
    const result = await processManager.killProcess(parseInt(pid));
    broadcast('ports:update', await portScanner.scan(config.portRanges));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get favorites
app.get('/api/favorites', (req, res) => {
  res.json(config.favorites);
});

// Add favorite port (singular endpoint - for backward compatibility)
app.post('/api/favorites/port', (req, res) => {
  try {
    const { port, name, notes } = req.body;
    const favorite = favoritesManager.addPort(config, port, name, notes);
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    res.json(favorite);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add favorite port (plural endpoint - matches client hook)
app.post('/api/favorites/ports', (req, res) => {
  try {
    const { port, name, notes } = req.body;
    const favorite = favoritesManager.addPort(config, port, name, notes);
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    res.json(favorite);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Remove favorite port (singular endpoint - for backward compatibility)
app.delete('/api/favorites/port/:port', (req, res) => {
  try {
    const { port } = req.params;
    favoritesManager.removePort(config, parseInt(port));
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Remove favorite port (plural endpoint - matches client hook)
app.delete('/api/favorites/ports/:portId', (req, res) => {
  try {
    const { portId } = req.params;
    // Try to parse as number first, then as string
    const portIdNum = parseInt(portId);
    favoritesManager.removePort(config, isNaN(portIdNum) ? portId : portIdNum);
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add favorite folder
app.post('/api/favorites/folder', (req, res) => {
  try {
    const { path, name, launchCommand } = req.body;
    const favorite = favoritesManager.addFolder(config, path, name, launchCommand);
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    res.json(favorite);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Remove favorite folder
app.delete('/api/favorites/folder/:id', (req, res) => {
  try {
    const { id } = req.params;
    favoritesManager.removeFolder(config, id);
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Launch npm script from folder
app.post('/api/launch', async (req, res) => {
  try {
    const { folderPath, script } = req.body;
    const launchId = await processManager.launchScript(folderPath, script, (log) => {
      broadcast('launch:log', { launchId, log });
    });

    // Send launch started message
    broadcast('launch_started', { launchId });

    res.json({ launchId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get launch logs (for reconnection)
app.get('/api/launch/:id/logs', (req, res) => {
  const { id } = req.params;
  const logs = processManager.getLogs(id);
  res.json(logs);
});

// Stop launch process
app.post('/api/launch/:id/stop', (req, res) => {
  const { id } = req.params;
  processManager.stopLaunch(id);
  res.json({ success: true });
});

// Get config
app.get('/api/config', (req, res) => {
  res.json({
    portRanges: config.portRanges,
    scanInterval: config.scanInterval
  });
});

// Update config
app.put('/api/config', (req, res) => {
  const { portRanges, scanInterval } = req.body;
  if (portRanges) config.portRanges = portRanges;
  if (scanInterval) config.scanInterval = scanInterval;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  res.json(config);
});

// SPA fallback
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(join(rootDir, 'client', 'dist', 'index.html'));
  });
}

// Start server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server ready on ws://localhost:${PORT}`);
  // Initial scan
  setTimeout(performScan, 1000);
});

export { app, server, wss, broadcast };
