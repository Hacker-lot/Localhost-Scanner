import net from 'net';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Check if a single port is open (checks both IPv4 and IPv6)
 */
async function checkPort(port) {
  // Try IPv4 first
  const ipv4Result = await checkPortOnHost(port, '127.0.0.1');
  if (ipv4Result) {
    console.log(`  Port ${port}: OPEN on IPv4`);
    return true;
  }

  // Try IPv6
  const ipv6Result = await checkPortOnHost(port, '::1');
  if (ipv6Result) {
    console.log(`  Port ${port}: OPEN on IPv6`);
    return true;
  }

  return false;
}

/**
 * Check if a port is open on a specific host
 */
async function checkPortOnHost(port, host) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 500);

    socket.once('connect', () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve(true);
    });

    socket.once('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });

    socket.connect(port, host);
  });
}

/**
 * Get process information for a port
 */
async function getProcessInfo(port) {
  try {
    const platform = process.platform;
    
    if (platform === 'win32') {
      // Windows: Use netstat to find PID, then tasklist for process name
      const netstatResult = await execAsync(
        `netstat -ano | findstr ":${port}" | findstr "LISTENING"`
      );
      
      if (!netstatResult.stdout.trim()) {
        return null;
      }

      const parts = netstatResult.stdout.trim().split(/\s+/);
      const pid = parts[parts.length - 1];

      if (!pid || pid === 'PID') {
        return null;
      }

      // Get process details
      const tasklistResult = await execAsync(
        `tasklist /FI "PID eq ${pid}" /FO CSV`
      );

      const csvLines = tasklistResult.stdout.trim().split('\r\n');
      if (csvLines.length < 2) {
        return { port, pid, processName: 'Unknown', command: '', cwd: '' };
      }

      // Parse CSV (handle quoted fields)
      const csv = csvLines[1].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
      const processName = csv[0]?.replace(/"/g, '') || 'Unknown';

      // Try to get command line using wmic
      try {
        const wmicResult = await execAsync(
          `wmic process where "ProcessId=${pid}" get CommandLine /FORMAT:VALUE`
        );
        const cmdMatch = wmicResult.stdout.match(/CommandLine=(.+)/);
        const command = cmdMatch ? cmdMatch[1] : '';

        // Try to extract working directory
        const cwdMatch = command.match(/['"]([^'"]*?)['"]/);
        const cwd = cwdMatch ? cwdMatch[1] : '';

        return { port, pid, processName, command, cwd };
      } catch {
        return { port, pid, processName, command: '', cwd: '' };
      }
    } else {
      // Linux/Mac: Use lsof
      const result = await execAsync(`lsof -i :${port} -t`);
      
      if (!result.stdout.trim()) {
        return null;
      }

      const pid = result.stdout.trim().split('\n')[0];
      
      // Get process details
      const psResult = await execAsync(`ps -p ${pid} -o comm=,args=`);
      const parts = psResult.stdout.trim().split(/\s+/);
      const processName = parts[0] || 'Unknown';
      const command = psResult.stdout.trim() || '';

      return { port, pid, processName, command, cwd: '' };
    }
  } catch (error) {
    console.error(`Error getting process info for port ${port}:`, error.message);
    return null;
  }
}

/**
 * Scan port ranges and return open ports with process info
 */
async function scan(portRanges) {
  const results = [];
  const portsToCheck = [];

  // Expand port ranges into individual ports
  portRanges.forEach(([start, end]) => {
    for (let port = start; port <= end; port++) {
      portsToCheck.push(port);
    }
  });

  console.log(`Scanning ${portsToCheck.length} ports...`);

  // Check ports in batches for better performance
  const batchSize = 100;
  for (let i = 0; i < portsToCheck.length; i += batchSize) {
    const batch = portsToCheck.slice(i, i + batchSize);
    const openPorts = await Promise.all(
      batch.map(async (port) => {
        const isOpen = await checkPort(port);
        return isOpen ? port : null;
      })
    );

    // Get process info for open ports
    for (const port of openPorts) {
      if (port !== null) {
        const processInfo = await getProcessInfo(port);
        if (processInfo) {
          results.push(processInfo);
        }
      }
    }
  }

  console.log(`Found ${results.length} open ports`);
  return results.sort((a, b) => a.port - b.port);
}

export default { scan, checkPort, getProcessInfo };
