import React, { useState } from "react";
import {
  saveKeyToStorage,
  getKeyFromStorage,
  getSheetIdFromStorage,
  deleteDataFromStorage
} from "../../utils/keytarStorage";

interface GoogleSyncModalProps {
  show: boolean;
  onClose: () => void;
  onSaved?: () => void;
  onDeleted?: () => void;
}

export const GoogleSyncModal: React.FC<GoogleSyncModalProps> = ({
  show,
  onClose,
  onSaved,
  onDeleted
}) => {
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [loadedContent, setLoadedContent] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [loadWarning, setLoadWarning] = useState<string | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [savedSheetId, setSavedSheetId] = useState<string | null>(null);
  const [showSavedConfirm, setShowSavedConfirm] = useState<boolean>(false);
  const [showDeletedConfirm, setShowDeletedConfirm] = useState<boolean>(false);
  const [googleSyncEnabled, setGoogleSyncEnabled] = useState<boolean>(false);
  // debugInfo removed; Inspect button no longer used
  React.useEffect(() => {
    if (!show) return;
    (async () => {
      try {
        // Always load from storage when modal opens to get the latest state
        const existing = await getKeyFromStorage();
        const existingSheet = await getSheetIdFromStorage();
        if (existing) {
          setLoadedFileName("Stored");
          setLoadedContent(existing);
          setSaveMessage(null);
        } else {
          setLoadedFileName(null);
          setLoadedContent(null);
        }
        if (existingSheet) {
          setSavedSheetId(existingSheet);
          setSheetId(existingSheet);
        } else {
          setSavedSheetId(null);
          setSheetId(null);
        }
        // load persisted settings to show the status in modal
        try {
          // @ts-ignore - preload API
          const res = await window.api?.settingsGet?.("googleSyncEnabled");
          if (res && res.ok) setGoogleSyncEnabled(Boolean(res.value));
        } catch {
          // ignore
        }
      } catch (err) {
        console.error("Failed to load Google credentials", err);
      }
    })();
  }, [show]);

  if (!show) return null;

  const handleLoadKey = async (): Promise<void> => {
    try {
      // @ts-ignore: preload exposes api
      const res = await window.api.loadGoogleKey();
      if (!res || res.canceled) return;
      const fp = res.filePath ?? null;
      const fileName = fp ? fp.replace(/^.*[\\/]/, "") : null;
      // Validate base filename must be credentials.json
      if (fileName !== "credentials.json") {
        setLoadWarning("Invalid key file - must be credentials.json");
        setLoadedFileName(null);
        setLoadedContent(null);
        return;
      }
      setLoadWarning(null);
      setLoadedFileName(fp);
      setLoadedContent(res.content ?? null);
      setSaveMessage(null);
    } catch (err) {
      console.error("Load key failed", err);
      setSaveMessage("Failed to load key");
    }
  };

  const handleDeleteData = async (): Promise<void> => {
    const res = await deleteDataFromStorage();
    if (res && res.ok) {
      setSaveMessage("Deleted");
      setShowDeletedConfirm(true);
      setLoadedContent(null);
      setLoadedFileName(null);
      setSheetId(null);
      setSavedSheetId(null);
      onDeleted?.();
    } else setSaveMessage(res?.error ?? "Delete failed");
  };

  const handleSaveKey = async (): Promise<void> => {
    if (!loadedContent) return;
    try {
      const res = await saveKeyToStorage(loadedContent, sheetId ?? undefined);
      if (res.ok) {
        let savedMsg = "Saved!";
        if (res.keyChunked) savedMsg = `Saved (chunked, parts: ${res.keyParts ?? "?"})`;
        if (res.keyFallbackPath) savedMsg = `Saved (fallback: ${res.keyFallbackPath})`;
        setSaveMessage(savedMsg);
        setShowSavedConfirm(true);
        onSaved?.();
        if (res.keyOk) setLoadedFileName("Stored");
        if (res.sheetOk && sheetId) setSavedSheetId(sheetId);
        setLoadWarning(null);
      } else {
        let msg = "Save failed";
        if (res.error) msg += `: ${res.error}`;
        if (res.keyOk === false) msg += " (key save failed)";
        if (res.sheetOk === false) msg += " (sheet save failed)";
        if (res.keyFallbackPath) msg += ` - saved to fallback: ${res.keyFallbackPath}`;
        setSaveMessage(msg);
      }
    } catch (err) {
      console.error("Save key failed", err);
      setSaveMessage("Save failed");
    }
  };

  // Sheet ID is saved together with the key via saveKeyToStorage

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content google-sync-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-message">
          <h2>Google Sync</h2>
          <p>Syncing requires a premade Google Sheet and a Google API Service Account key.</p>
          <br />
          <ol>
            <li>Create new Project</li>
            <li>Create a Google API Service Account</li>
            <li>Enable API: Google Sheets API, Google Drive API</li>
            <li>Download the Service Account key (JSON)</li>
            <li>Create a dedicated Google Sheet for CmdForge</li>
            <li>Share the Google Sheet with the service account email</li>
            <li>Copy the Google Sheet ID</li>
          </ol>
        </div>
        {loadWarning && <div className="modal-warning">{loadWarning}</div>}
        <div className="modal-actions">
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button className="btn-primary btn-small" onClick={handleLoadKey}>
              Attach Key
            </button>
            <button
              className="btn-primary btn-small"
              onClick={handleSaveKey}
              disabled={!loadedContent || !sheetId}
            >
              Save
            </button>
            <button className="btn-primary btn-small" onClick={handleDeleteData}>
              Delete Data
            </button>
            <button className="btn-primary btn-small" onClick={onClose}>
              Close
            </button>
            {/* Dev-only Inspect button hidden by default */}
          </div>
        </div>
        {/* sheet input centered under actions */}
        <div className="sheet-input-row" style={{ justifyContent: "center", marginTop: 8 }}>
          <input
            placeholder="Enter Google Sheet ID"
            value={sheetId ?? ""}
            onChange={(e) => setSheetId(e.target.value)}
            style={{ width: 360 }}
          />
        </div>
        <div style={{ marginTop: 12 }}>
          <div>Key: {loadedFileName ?? "None"}</div>
          <div>Sheet ID: {savedSheetId ?? "None"}</div>
          {saveMessage && <div style={{ marginTop: 8 }}>{saveMessage}</div>}
          <div style={{ marginTop: 8 }}>
            <small>
              Auto-sync is <strong>{googleSyncEnabled ? "enabled" : "disabled"}</strong> — toggle it
              in the header.
            </small>
          </div>
          {/* debugInfo removed */}
          {showSavedConfirm && (
            <div className="modal-confirmation">
              <div className="modal-confirmation-card">
                <div>Saved!</div>
                <div style={{ marginTop: 8 }}>
                  <button
                    className="btn-primary btn-small"
                    onClick={() => {
                      setShowSavedConfirm(false);
                      onClose();
                    }}
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          )}
          {showDeletedConfirm && (
            <div className="modal-confirmation">
              <div className="modal-confirmation-card">
                <div>Deleted</div>
                <div style={{ marginTop: 8 }}>
                  <button
                    className="btn-primary btn-small"
                    onClick={() => {
                      setShowDeletedConfirm(false);
                      onClose();
                    }}
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleSyncModal;
