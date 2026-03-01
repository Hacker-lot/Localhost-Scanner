import { spawn } from 'child_process';
import path from 'path';

// Store active launches with their processes and logs
const launches = new Map();
let launchIdCounter = 0;

/**
 * Kill a process by PID (cross-platform)
 * @param {number} pid - Process ID to kill
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function killProcess(pid) {
  return new Promise((resolve) => {
    if (!pid || typeof pid !== 'number') {
      resolve({ success: false, message: 'Invalid PID' });
      return;
    }

    const platform = process.platform;
    let command;
    let args;

    if (platform === 'win32') {
      // Windows: use taskkill
      command = 'taskkill';
      args = ['/PID', pid.toString(), '/F'];
    } else {
      // Linux/Mac: use kill
      command = 'kill';
      args = ['-9', pid.toString()];
    }

    const proc = spawn(command, args);
    let errorOutput = '';
    let successOutput = '';

    proc.stdout.on('data', (data) => {
      successOutput += data.toString();
    });

    proc.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, message: `Process ${pid} killed successfully` });
      } else {
        // On Windows, taskkill returns 128 if process not found, 0 on success
        // On Linux, kill returns non-zero on error
        if (platform === 'win32' && errorOutput.includes('not found')) {
          resolve({ success: false, message: `Process ${pid} not found` });
        } else if (errorOutput) {
          resolve({ success: false, message: `Failed to kill process ${pid}: ${errorOutput.trim()}` });
        } else {
          resolve({ success: false, message: `Failed to kill process ${pid} (code: ${code})` });
        }
      }
    });

    proc.on('error', (err) => {
      resolve({ success: false, message: `Error killing process ${pid}: ${err.message}` });
    });
  });
}

/**
 * Launch an npm script from a folder
 * @param {string} folderPath - Path to the project folder
 * @param {string} script - npm script name (e.g., 'start', 'dev')
 * @param {function} onLog - Callback function for log output
 * @returns {string} launchId - Unique identifier for this launch
 */
function launchScript(folderPath, script, onLog) {
  const launchId = `launch_${Date.now()}_${++launchIdCounter}`;
  
  const platform = process.platform;
  let command;
  let args;

  if (platform === 'win32') {
    // Windows: use npm.cmd
    command = 'npm.cmd';
    args = ['run', script];
  } else {
    // Linux/Mac: use npm
    command = 'npm';
    args = ['run', script];
  }

  const proc = spawn(command, args, {
    cwd: folderPath,
    shell: true,
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  const logs = [];
  const startTime = Date.now();

  // Store launch info
  launches.set(launchId, {
    process: proc,
    logs,
    folderPath,
    script,
    startTime,
    status: 'running'
  });

  // Handle stdout
  proc.stdout.on('data', (data) => {
    const logLine = data.toString();
    logs.push({
      timestamp: Date.now(),
      type: 'stdout',
      content: logLine
    });
    if (onLog) {
      onLog({ timestamp: Date.now(), type: 'stdout', content: logLine });
    }
  });

  // Handle stderr
  proc.stderr.on('data', (data) => {
    const logLine = data.toString();
    logs.push({
      timestamp: Date.now(),
      type: 'stderr',
      content: logLine
    });
    if (onLog) {
      onLog({ timestamp: Date.now(), type: 'stderr', content: logLine });
    }
  });

  // Handle process exit
  proc.on('close', (code) => {
    const launch = launches.get(launchId);
    if (launch) {
      launch.status = code === 0 ? 'completed' : 'exited';
      launch.exitCode = code;
      logs.push({
        timestamp: Date.now(),
        type: 'system',
        content: `Process exited with code ${code}`
      });
      if (onLog) {
        onLog({ timestamp: Date.now(), type: 'system', content: `Process exited with code ${code}` });
      }
    }
  });

  // Handle process error
  proc.on('error', (err) => {
    const launch = launches.get(launchId);
    if (launch) {
      launch.status = 'error';
      launch.error = err.message;
      logs.push({
        timestamp: Date.now(),
        type: 'error',
        content: `Spawn error: ${err.message}`
      });
      if (onLog) {
        onLog({ timestamp: Date.now(), type: 'error', content: `Spawn error: ${err.message}` });
      }
    }
  });

  // Log launch start
  logs.push({
    timestamp: Date.now(),
    type: 'system',
    content: `Launched: ${command} ${args.join(' ')} in ${folderPath}`
  });
  if (onLog) {
    onLog({ timestamp: Date.now(), type: 'system', content: `Launched: ${command} ${args.join(' ')} in ${folderPath}` });
  }

  return launchId;
}

/**
 * Get logs for a launch
 * @param {string} launchId - Launch identifier
 * @returns {Array} Array of log entries
 */
function getLogs(launchId) {
  const launch = launches.get(launchId);
  if (!launch) {
    return [];
  }
  return launch.logs;
}

/**
 * Stop a running launch
 * @param {string} launchId - Launch identifier
 * @returns {{success: boolean, message: string}}
 */
function stopLaunch(launchId) {
  const launch = launches.get(launchId);
  
  if (!launch) {
    return { success: false, message: `Launch ${launchId} not found` };
  }

  if (launch.status !== 'running') {
    return { success: false, message: `Launch ${launchId} is not running (status: ${launch.status})` };
  }

  const proc = launch.process;
  
  if (!proc || proc.killed) {
    launch.status = 'stopped';
    return { success: true, message: `Launch ${launchId} already stopped` };
  }

  try {
    const platform = process.platform;
    
    if (platform === 'win32') {
      // Windows: kill the entire process tree
      spawn('taskkill', ['/PID', proc.pid.toString(), '/F', '/T']);
    } else {
      // Linux/Mac: send SIGTERM first, then SIGKILL if needed
      proc.kill('SIGTERM');
      
      // Force kill after a short delay if still running
      setTimeout(() => {
        if (launch.process && !launch.process.killed) {
          launch.process.kill('SIGKILL');
        }
      }, 2000);
    }

    launch.status = 'stopped';
    launch.logs.push({
      timestamp: Date.now(),
      type: 'system',
      content: `Launch stopped by user`
    });

    return { success: true, message: `Launch ${launchId} stopped` };
  } catch (err) {
    return { success: false, message: `Error stopping launch: ${err.message}` };
  }
}

export default { killProcess, launchScript, getLogs, stopLaunch };
