import fs from 'fs';
import path from 'path';

/**
 * Validate that a path exists and is accessible
 * @param {string} folderPath - Path to validate
 * @returns {{valid: boolean, error?: string}}
 */
function validatePath(folderPath) {
  if (!folderPath || typeof folderPath !== 'string') {
    return { valid: false, error: 'Invalid path provided' };
  }

  try {
    // Resolve to absolute path
    const resolvedPath = path.resolve(folderPath);
    
    // Check if path exists
    if (!fs.existsSync(resolvedPath)) {
      return { valid: false, error: `Path does not exist: ${resolvedPath}` };
    }

    // Check if path is a directory
    const stats = fs.statSync(resolvedPath);
    if (!stats.isDirectory()) {
      return { valid: false, error: `Path is not a directory: ${resolvedPath}` };
    }

    // Check if path is readable
    try {
      fs.accessSync(resolvedPath, fs.constants.R_OK);
    } catch {
      return { valid: false, error: `Path is not readable: ${resolvedPath}` };
    }

    return { valid: true, resolvedPath };
  } catch (err) {
    return { valid: false, error: `Error validating path: ${err.message}` };
  }
}

/**
 * Add a favorite port to the config
 * @param {Object} config - Configuration object
 * @param {number} port - Port number
 * @param {string} name - Friendly name for the port
 * @param {string} notes - Optional notes
 * @returns {Object} The added favorite object
 */
function addPort(config, port, name, notes = '') {
  // Validate port
  if (!port || typeof port !== 'number' || port < 1 || port > 65535) {
    throw new Error('Invalid port number. Must be between 1 and 65535.');
  }

  // Validate name
  if (!name || typeof name !== 'string' || name.trim() === '') {
    throw new Error('Port name is required.');
  }

  // Initialize favorites if not present
  if (!config.favorites) {
    config.favorites = { ports: [], folders: [] };
  }
  if (!config.favorites.ports) {
    config.favorites.ports = [];
  }

  // Check if port already exists
  const existingIndex = config.favorites.ports.findIndex(p => p.port === port);
  if (existingIndex !== -1) {
    throw new Error(`Port ${port} is already in favorites.`);
  }

  // Create favorite object
  const favorite = {
    port,
    name: name.trim(),
    notes: notes || '',
    addedAt: new Date().toISOString()
  };

  // Add to favorites
  config.favorites.ports.push(favorite);

  return favorite;
}

/**
 * Remove a favorite port from the config
 * @param {Object} config - Configuration object
 * @param {number} port - Port number to remove
 * @returns {boolean} True if removed, false if not found
 */
function removePort(config, port) {
  if (!config.favorites || !config.favorites.ports) {
    return false;
  }

  const index = config.favorites.ports.findIndex(p => p.port === port);
  
  if (index === -1) {
    return false;
  }

  config.favorites.ports.splice(index, 1);
  return true;
}

/**
 * Add a favorite folder to the config
 * @param {Object} config - Configuration object
 * @param {string} folderPath - Path to the folder
 * @param {string} name - Friendly name for the folder
 * @param {string} launchCommand - npm script to launch (e.g., 'start', 'dev')
 * @returns {Object} The added favorite object
 */
function addFolder(config, folderPath, name, launchCommand = 'start') {
  // Validate path exists
  const validation = validatePath(folderPath);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Validate name
  if (!name || typeof name !== 'string' || name.trim() === '') {
    throw new Error('Folder name is required.');
  }

  // Validate launch command
  if (!launchCommand || typeof launchCommand !== 'string' || launchCommand.trim() === '') {
    throw new Error('Launch command is required.');
  }

  // Initialize favorites if not present
  if (!config.favorites) {
    config.favorites = { ports: [], folders: [] };
  }
  if (!config.favorites.folders) {
    config.favorites.folders = [];
  }

  // Check if folder path already exists
  const existingIndex = config.favorites.folders.findIndex(f => f.path === validation.resolvedPath);
  if (existingIndex !== -1) {
    throw new Error(`Folder is already in favorites.`);
  }

  // Generate unique ID
  const id = `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Create favorite object
  const favorite = {
    id,
    path: validation.resolvedPath,
    name: name.trim(),
    launchCommand: launchCommand.trim(),
    addedAt: new Date().toISOString()
  };

  // Add to favorites
  config.favorites.folders.push(favorite);

  return favorite;
}

/**
 * Remove a favorite folder from the config
 * @param {Object} config - Configuration object
 * @param {string} id - Folder ID to remove
 * @returns {boolean} True if removed, false if not found
 */
function removeFolder(config, id) {
  if (!config.favorites || !config.favorites.folders) {
    return false;
  }

  const index = config.favorites.folders.findIndex(f => f.id === id);
  
  if (index === -1) {
    return false;
  }

  config.favorites.folders.splice(index, 1);
  return true;
}

export default { addPort, removePort, addFolder, removeFolder, validatePath };
