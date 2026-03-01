import { useState, useEffect } from 'react';
import PortList from './components/PortList';
import PortCard from './components/PortCard';
import FavoritesPanel from './components/FavoritesPanel';
import QuickLaunch from './components/QuickLaunch';
import Settings from './components/Settings';
import ToastContainer from './components/ToastContainer';
import { usePortScanner } from './hooks/usePortScanner';
import { useFavorites } from './hooks/useFavorites';
import { useQuickLaunch } from './hooks/useQuickLaunch';
import './App.css';

function App() {
  const { ports, loading, error, scan, startAutoScan, stopAutoScan, isConnected } = usePortScanner();
  const { favorites, addPort, removePort, addFolder, removeFolder, refresh: refreshFavorites } = useFavorites();
  const { launch, stop, logs, isRunning, clearLogs, isConnected: launchConnected } = useQuickLaunch();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('port');
  const [expandedPort, setExpandedPort] = useState(null);
  const [showFavorites, setShowFavorites] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [quickLaunchFolder, setQuickLaunchFolder] = useState(null);

  // Initialize theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'system';
    const applyTheme = (theme) => {
      const root = document.documentElement;
      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.setAttribute('data-theme', systemTheme);
      } else {
        root.setAttribute('data-theme', theme);
      }
    };
    applyTheme(savedTheme);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = () => {
      if (savedTheme === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange);
    };
  }, []);

  // Auto-scan on mount
  useEffect(() => {
    startAutoScan();
    refreshFavorites();
    return () => stopAutoScan();
  }, []);

  // Filter and sort ports
  const filteredPorts = ports
    .filter(port => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        port.processName?.toLowerCase().includes(term) ||
        port.command?.toLowerCase().includes(term) ||
        port.cwd?.toLowerCase().includes(term) ||
        port.port.toString().includes(term)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'port':
          return a.port - b.port;
        case 'name':
          return (a.processName || '').localeCompare(b.processName || '');
        case 'pid':
          return (a.pid || 0) - (b.pid || 0);
        default:
          return 0;
      }
    });

  const handleAddFavoritePort = async (portData) => {
    try {
      await addPort({
        port: portData.port,
        name: portData.processName || `Port ${portData.port}`,
        notes: ''
      });
      // Show success toast
      if (window.showToast) {
        window.showToast(`Added port ${portData.port} to favorites`, 'success');
      }
    } catch (error) {
      // Show error toast
      if (window.showToast) {
        window.showToast(`Failed to add favorite: ${error.message}`, 'error');
      }
    }
  };

  const handleQuickLaunch = (folder) => {
    setQuickLaunchFolder(folder);
  };

  const handleCloseQuickLaunch = () => {
    setQuickLaunchFolder(null);
    clearLogs();
  };

  const handleClosePort = async (portData) => {
    if (!portData.pid) {
      alert('No PID available for this port');
      return;
    }

    if (confirm(`Are you sure you want to close port ${portData.port} (PID: ${portData.pid})?`)) {
      try {
        const response = await fetch(`/api/ports/${portData.pid}/kill`, {
          method: 'POST'
        });
        
        if (response.ok) {
          // Refresh the scan
          scan();
        } else {
          const error = await response.json();
          alert(`Failed to close port: ${error.error}`);
        }
      } catch (err) {
        alert(`Failed to close port: ${err.message}`);
      }
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <h1>🔍 Localhost Scanner</h1>
          <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
        <div className="header-right">
          <button onClick={() => setShowSettings(!showSettings)} className="btn-icon">
            ⚙️ Settings
          </button>
          <button onClick={() => setShowFavorites(!showFavorites)} className="btn-icon">
            ⭐ Favorites
          </button>
          <button onClick={() => scan()} className="btn-primary" disabled={loading}>
            {loading ? '⏳ Scanning...' : '🔄 Scan Now'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="app-content">
        {/* Main Panel */}
        <main className="main-panel">
          {/* Toolbar */}
          <div className="toolbar">
            <input
              type="text"
              placeholder="Search ports, processes, folders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
              <option value="port">Sort by Port</option>
              <option value="name">Sort by Name</option>
              <option value="pid">Sort by PID</option>
            </select>
          </div>

          {/* Error Display */}
          {error && (
            <div className="error-banner">
              {error}
            </div>
          )}

          {/* Port List */}
          <PortList
            ports={filteredPorts}
            loading={loading}
            expandedPort={expandedPort}
            onToggleExpand={setExpandedPort}
            onAddFavorite={handleAddFavoritePort}
            onQuickLaunch={handleQuickLaunch}
            onClosePort={handleClosePort}
            favorites={favorites.ports || []}
          />

          {/* Empty State */}
          {!loading && filteredPorts.length === 0 && (
            <div className="empty-state">
              <p>🔍 No open ports found</p>
              <p className="empty-hint">Start a dev server or adjust your port range in settings</p>
            </div>
          )}
        </main>

        {/* Favorites Sidebar */}
        {showFavorites && (
          <aside className="favorites-sidebar">
            <FavoritesPanel
              favorites={favorites}
              ports={ports}
              onRemovePort={removePort}
              onRemoveFolder={removeFolder}
              onLaunchFolder={handleQuickLaunch}
              onRefresh={refreshFavorites}
            />
          </aside>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="settings-overlay" onClick={() => setShowSettings(false)}>
            <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
              <Settings onClose={() => setShowSettings(false)} />
            </div>
          </div>
        )}
      </div>

      {/* Quick Launch Modal */}
      {quickLaunchFolder && (
        <QuickLaunch
          folder={quickLaunchFolder}
          logs={logs}
          isRunning={isRunning}
          onLaunch={launch}
          onStop={stop}
          onClose={handleCloseQuickLaunch}
        />
      )}

      {/* Toast Container */}
      <ToastContainer />
    </div>
  );
}

export default App;
