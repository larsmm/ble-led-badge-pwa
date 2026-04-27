import { ChangeEvent } from "react";

import { WebBluetoothSupport } from "../bluetooth";

type StatusViewProps = {
  connectionStatus: string;
  deviceName: string;
  errorMessage: string | null;
  installPrompt: BeforeInstallPromptEvent | null;
  isInstalled: boolean;
  lastAction: string;
  lastNotificationAscii: string | null;
  lastNotificationHex: string | null;
  onClearLocalStorage: () => void;
  onExportLocalStorage: () => void;
  onImportLocalStorage: (event: ChangeEvent<HTMLInputElement>) => void;
  onInstallApp: () => void;
  support: WebBluetoothSupport;
};

export function StatusView({
  connectionStatus,
  deviceName,
  errorMessage,
  installPrompt,
  isInstalled,
  lastAction,
  lastNotificationAscii,
  lastNotificationHex,
  onClearLocalStorage,
  onExportLocalStorage,
  onImportLocalStorage,
  onInstallApp,
  support
}: StatusViewProps) {
  return (
    <>
      <article className="panel">
        <h2>App Data</h2>
        <div className="button-row compact-row">
          <button
            className="secondary-button"
            type="button"
            onClick={onExportLocalStorage}
          >
            Export Backup
          </button>
          <label className="file-picker-label app-data-import">
            <span>Import Backup</span>
            <input
              className="file-input"
              type="file"
              accept="application/json,.json"
              onChange={onImportLocalStorage}
            />
          </label>
          <button
            className="secondary-button"
            type="button"
            onClick={onClearLocalStorage}
          >
            Clear App Data
          </button>
        </div>
      </article>

      <article className="panel">
        <h2>Support</h2>
        <p className="support-summary">{support.message}</p>
        <div className="status-meta-grid">
          <div className="status-meta-item">
            <span className="summary-label">Secure</span>
            <strong>{support.isSecureContext ? "Yes" : "No"}</strong>
          </div>
          <div className="status-meta-item">
            <span className="summary-label">Bluetooth</span>
            <strong>{support.hasBluetoothApi ? "Yes" : "No"}</strong>
          </div>
          <div className="status-meta-item">
            <span className="summary-label">PWA</span>
            <strong>{isInstalled ? "Installed" : "Browser"}</strong>
          </div>
        </div>
        <div className="button-row compact-row">
          {isInstalled ? (
            <span className="install-chip">Installed</span>
          ) : installPrompt ? (
            <button
              className="install-button"
              type="button"
              onClick={onInstallApp}
            >
              Install App
            </button>
          ) : (
            <p className="panel-note compact-note">
              Install appears only when Chrome offers it.
            </p>
          )}
        </div>
      </article>

      <article className="panel">
        <h2>Status</h2>
        <div className="status-meta-grid">
          <div className="status-meta-item">
            <span className="summary-label">Connection</span>
            <strong>{connectionStatus}</strong>
          </div>
          <div className="status-meta-item">
            <span className="summary-label">Badge</span>
            <strong>{deviceName}</strong>
          </div>
        </div>
        <p className="panel-note">{lastAction}</p>
        {lastNotificationHex ? (
          <p className="notification-line">
            Last notification: {lastNotificationHex}
          </p>
        ) : null}
        {lastNotificationAscii ? (
          <p className="panel-note">Notification ASCII: {lastNotificationAscii}</p>
        ) : null}
        {errorMessage ? <p className="error-line">{errorMessage}</p> : null}
      </article>
    </>
  );
}
