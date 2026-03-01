import { useState, useEffect } from 'react';
import './Settings.css';

/**
 * Settings Component
 * Settings panel for configuring scanner options
 * @param {Function} onClose - Callback for closing settings
 */
function Settings({ onClose }) {
  const [settings, setSettings] = useState({
    portRanges: [[3000, 9999]],
    scanInterval: 5000,
  });

  const [theme, setTheme] = useState('system');
  const [hasChanges, setHasChanges] = useState(false);
  const [newRangeStart, setNewRangeStart] = useState('');
  const [newRangeEnd, setNewRangeEnd] = useState('');

  useEffect(() => {
    // Load current settings from API
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        setSettings(data);
      })
      .catch(err => console.error('Failed to load settings:', err));

    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'system';
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (themeValue) => {
    const root = document.documentElement;
    if (themeValue === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.setAttribute('data-theme', systemTheme);
    } else {
      root.setAttribute('data-theme', themeValue);
    }
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  const handleAddRange = () => {
    const start = parseInt(newRangeStart);
    const end = parseInt(newRangeEnd);
    
    if (start && end && start <= end) {
      setSettings(prev => ({
        ...prev,
        portRanges: [...prev.portRanges, [start, end]].sort((a, b) => a[0] - b[0])
      }));
      setNewRangeStart('');
      setNewRangeEnd('');
      setHasChanges(true);
    }
  };

  const handleRemoveRange = (index) => {
    setSettings(prev => ({
      ...prev,
      portRanges: prev.portRanges.filter((_, i) => i !== index)
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      const response = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      
      if (response.ok) {
        setHasChanges(false);
        onClose?.();
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  const handleReset = () => {
    setSettings({
      portRanges: [[3000, 9999]],
      scanInterval: 5000,
    });
    setHasChanges(true);
  };

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2 className="settings-title">⚙️ Settings</h2>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>

      <div className="settings-content">
        <div className="settings-section">
          <h3 className="section-heading">Port Ranges</h3>
          
          <div className="port-ranges-list">
            {settings.portRanges.map((range, index) => (
              <div key={index} className="port-range-item">
                <span className="port-range-text">{range[0]} - {range[1]}</span>
                <button 
                  className="remove-range-btn"
                  onClick={() => handleRemoveRange(index)}
                  disabled={settings.portRanges.length === 1}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="add-range-form">
            <input
              type="number"
              placeholder="Start port"
              className="setting-input small"
              value={newRangeStart}
              onChange={(e) => setNewRangeStart(e.target.value)}
              min="1"
              max="65535"
            />
            <span className="range-separator">-</span>
            <input
              type="number"
              placeholder="End port"
              className="setting-input small"
              value={newRangeEnd}
              onChange={(e) => setNewRangeEnd(e.target.value)}
              min="1"
              max="65535"
            />
            <button className="add-range-btn" onClick={handleAddRange}>
              + Add Range
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="section-heading">Appearance</h3>

          <div className="setting-group">
            <label className="setting-label">Theme</label>
            <div className="theme-options">
              <button
                className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                onClick={() => handleThemeChange('light')}
              >
                <span className="theme-icon">☀️</span>
                <span className="theme-name">Light</span>
              </button>
              <button
                className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => handleThemeChange('dark')}
              >
                <span className="theme-icon">🌙</span>
                <span className="theme-name">Dark</span>
              </button>
              <button
                className={`theme-option ${theme === 'system' ? 'active' : ''}`}
                onClick={() => handleThemeChange('system')}
              >
                <span className="theme-icon">💻</span>
                <span className="theme-name">System</span>
              </button>
            </div>
            <span className="setting-hint">Choose your preferred color theme</span>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="section-heading">Scan Settings</h3>

          <div className="setting-group">
            <label htmlFor="scanInterval" className="setting-label">
              Scan Interval (ms)
            </label>
            <input
              id="scanInterval"
              type="number"
              className="setting-input"
              value={settings.scanInterval}
              onChange={(e) => {
                setSettings(prev => ({ ...prev, scanInterval: parseInt(e.target.value) || 5000 }));
                setHasChanges(true);
              }}
              min="1000"
              max="60000"
              step="1000"
            />
            <span className="setting-hint">Time between automatic scans (1000-60000ms)</span>
          </div>
        </div>

        <div className="settings-actions">
          <button className="reset-btn" onClick={handleReset} type="button">
            Reset to Defaults
          </button>
          <button
            className="save-btn"
            onClick={handleSave}
            type="button"
            disabled={!hasChanges}
          >
            Save Settings
          </button>
        </div>

        {hasChanges && (
          <div className="unsaved-changes">
            You have unsaved changes
          </div>
        )}
      </div>
    </div>
  );
}

export default Settings;
