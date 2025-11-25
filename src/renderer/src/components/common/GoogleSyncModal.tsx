import React, { useState } from "react";
import {
  saveKeyToStorage,
  getKeyFromStorage,
  saveSheetIdToStorage,
  getSheetIdFromStorage,
  deleteDataFromStorage
} from "../../utils/keytarStorage";

interface GoogleSyncModalProps {
  show: boolean;
  onClose: () => void;
}

export const GoogleSyncModal: React.FC<GoogleSyncModalProps> = ({ show, onClose }) => {
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [loadedContent, setLoadedContent] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [loadWarning, setLoadWarning] = useState<string | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [savedSheetId, setSavedSheetId] = useState<string | null>(null);
  React.useEffect(() => {
    if (!show) return;
    (async () => {
      try {
        const existing = await getKeyFromStorage();
        const existingSheet = await getSheetIdFromStorage();
        if (existing) {
          setLoadedFileName("Stored");
          setLoadedContent(existing);
          setSaveMessage("Key present");
        }
        if (existingSheet) {
          setSavedSheetId(existingSheet);
          setSheetId(existingSheet);
        }
      } catch {
        // ignore
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
    const ok = await deleteDataFromStorage();
    if (ok) {
      setSaveMessage("Data deleted");
      setLoadedContent(null);
      setLoadedFileName(null);
      setSheetId(null);
      setSavedSheetId(null);
    } else setSaveMessage("Delete failed");
  };

  const handleSaveKey = async (): Promise<void> => {
    if (!loadedContent) return;
    try {
      const ok = await saveKeyToStorage(loadedContent);
      if (ok) {
        setSaveMessage("Key saved to secure storage");
        setLoadWarning(null);
      } else setSaveMessage("Save failed");
    } catch (err) {
      console.error("Save key failed", err);
      setSaveMessage("Save failed");
    }
  };

  const handleSaveSheetId = async (): Promise<void> => {
    if (!sheetId) return;
    try {
      const ok = await saveSheetIdToStorage(sheetId);
      if (ok) {
        setSavedSheetId(sheetId);
        setSaveMessage("Sheet ID saved to secure storage");
      } else setSaveMessage("Save sheet id failed");
    } catch (err) {
      console.error("Save sheet id failed", err);
      setSaveMessage("Save sheet id failed");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content google-sync-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-message">
          <h2>Google Sync</h2>
          <p>Syncing requires a premade Google Sheet and a Google API Service Account key.</p>
          <br />
          <ol>
            <li>Create a Google API Service Account</li>
            <li>Download the Service Account key (JSON)</li>
            <li>Create a dedicated Google Sheet for CmdForge</li>
            <li>Share the Google Sheet with the service account email</li>
          </ol>
        </div>
        {loadWarning && <div className="modal-warning">{loadWarning}</div>}
        <div className="modal-actions">
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button className="btn-primary" onClick={handleLoadKey}>
              Attach Key
            </button>
            <button className="btn-primary" onClick={handleSaveKey} disabled={!loadedContent}>
              Save Key
            </button>
            <button className="btn-secondary" onClick={handleDeleteData}>
              Delete Data
            </button>
            <button className="btn-primary" onClick={handleSaveSheetId} disabled={!sheetId}>
              Save Sheet ID
            </button>
            <button className="btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <div>Loaded file: {loadedFileName ?? "None"}</div>
          <div>
            Sheet ID: {savedSheetId ?? "None"}
            <div style={{ marginTop: 6 }}>
              <input
                placeholder="Enter Google Sheet ID"
                value={sheetId ?? ""}
                onChange={(e) => setSheetId(e.target.value)}
                style={{ width: 360 }}
              />
            </div>
          </div>
          {saveMessage && <div style={{ marginTop: 8 }}>{saveMessage}</div>}
        </div>
      </div>
    </div>
  );
};

export default GoogleSyncModal;
