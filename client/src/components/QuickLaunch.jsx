import { useEffect, useRef } from 'react';
import './QuickLaunch.css';

/**
 * QuickLaunch Component
 * Modal component for launching npm scripts from a folder
 * @param {Object} folder - Folder object with path, name, launchCommand
 * @param {Array} logs - Array of log strings
 * @param {boolean} isRunning - Running state
 * @param {Function} onLaunch - Callback for launching script
 * @param {Function} onStop - Callback for stopping
 * @param {Function} onClose - Callback for closing modal
 */
function QuickLaunch({ folder, logs = [], isRunning = false, onLaunch, onStop, onClose }) {
  const terminalRef = useRef(null);
  const availableScripts = ['dev', 'start', 'build', 'test'];

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const handleLaunch = (script) => {
    onLaunch?.(folder.path, script);
  };

  const handleStop = () => {
    onStop?.();
  };

  return (
    <div className="quick-launch-overlay" onClick={onClose}>
      <div className="quick-launch-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrapper">
            <span className="folder-icon">📁</span>
            <div>
              <h2 className="modal-title">{folder.name || 'Quick Launch'}</h2>
              <p className="modal-path">{folder.path}</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Scripts List */}
          {!isRunning && (
            <div className="scripts-section">
              <h3 className="scripts-title">Available Scripts</h3>
              <div className="scripts-grid">
                {availableScripts.map((script) => (
                  <button
                    key={script}
                    className="script-card"
                    onClick={() => handleLaunch(script)}
                    disabled={isRunning}
                  >
                    <span className="script-name">npm run {script}</span>
                    <span className="script-hint">
                      {script === folder.launchCommand ? '⚡ Default' : ''}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Terminal Output */}
          <div className="terminal-section">
            <div className="terminal-header">
              <h3 className="terminal-title">
                {isRunning ? '🔴 Running...' : 'Terminal Output'}
              </h3>
              <div className="terminal-actions">
                {isRunning && (
                  <button className="stop-btn" onClick={handleStop}>
                    ⏹ Stop
                  </button>
                )}
                <button className="clear-btn" disabled>
                  🗑 Clear
                </button>
              </div>
            </div>
            <div className="terminal-output" ref={terminalRef}>
              {logs.length === 0 ? (
                <p className="terminal-empty">
                  {isRunning ? 'Starting...' : 'Select a script to run'}
                </p>
              ) : (
                logs.map((line, index) => (
                  <div key={index} className="terminal-line">
                    {line}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          {isRunning && (
            <button className="stop-btn-large" onClick={handleStop}>
              ⏹ Stop Process
            </button>
          )}
          <button className="close-btn" onClick={onClose}>
            {isRunning ? 'Close (Still Running)' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default QuickLaunch;
