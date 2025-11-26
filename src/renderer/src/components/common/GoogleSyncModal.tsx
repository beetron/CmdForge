import React, { useState } from "react";
import {
  saveKeyToStorage,
  getKeyFromStorage,
  getSheetIdFromStorage,
  deleteDataFromStorage
} from "../../utils/keytarStorage";
import { useTranslation } from "../../contexts/I18nContext";

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
  const { t } = useTranslation();
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
        setLoadWarning(t("googleSyncModal.invalidKeyFile"));
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
      setSaveMessage(t("googleSyncModal.failedToLoadKey"));
    }
  };

  const handleDeleteData = async (): Promise<void> => {
    const res = await deleteDataFromStorage();
    if (res && res.ok) {
      setSaveMessage(t("googleSyncModal.deleted"));
      setShowDeletedConfirm(true);
      setLoadedContent(null);
      setLoadedFileName(null);
      setSheetId(null);
      setSavedSheetId(null);
      onDeleted?.();
    } else setSaveMessage(res?.error ?? t("googleSyncModal.deleteFailed"));
  };

  const handleSaveKey = async (): Promise<void> => {
    if (!loadedContent) return;
    try {
      const res = await saveKeyToStorage(loadedContent, sheetId ?? undefined);
      if (res.ok) {
        let savedMsg = t("googleSyncModal.saved");
        if (res.keyChunked)
          savedMsg = t("googleSyncModal.savedChunked", { parts: String(res.keyParts ?? "?") });
        if (res.keyFallbackPath)
          savedMsg = t("googleSyncModal.savedFallback", { path: res.keyFallbackPath });
        setSaveMessage(savedMsg);
        setShowSavedConfirm(true);
        onSaved?.();
        if (res.keyOk) setLoadedFileName(t("googleSyncModal.stored"));
        if (res.sheetOk && sheetId) setSavedSheetId(sheetId);
        setLoadWarning(null);
      } else {
        let msg = t("googleSyncModal.saveFailed");
        if (res.error) msg += `: ${res.error}`;
        if (res.keyOk === false) msg += t("googleSyncModal.keySaveFailed");
        if (res.sheetOk === false) msg += t("googleSyncModal.sheetSaveFailed");
        if (res.keyFallbackPath)
          msg += ` - ${t("googleSyncModal.savedFallback", { path: res.keyFallbackPath })}`;
        setSaveMessage(msg);
      }
    } catch (err) {
      console.error("Save key failed", err);
      setSaveMessage(t("googleSyncModal.saveFailed"));
    }
  };

  // Sheet ID is saved together with the key via saveKeyToStorage

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content google-sync-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-message">
          <h2>{t("googleSyncModal.title")}</h2>
          <p>{t("googleSyncModal.description")}</p>
          <br />
          <ol>
            <li>{t("googleSyncModal.steps.1")}</li>
            <li>{t("googleSyncModal.steps.2")}</li>
            <li>{t("googleSyncModal.steps.3")}</li>
            <li>{t("googleSyncModal.steps.4")}</li>
            <li>{t("googleSyncModal.steps.5")}</li>
            <li>{t("googleSyncModal.steps.6")}</li>
            <li>{t("googleSyncModal.steps.7")}</li>
          </ol>
        </div>
        {loadWarning && <div className="modal-warning">{loadWarning}</div>}
        <div className="modal-actions">
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button className="btn-primary btn-small" onClick={handleLoadKey}>
              {t("googleSyncModal.attachKey")}
            </button>
            <button
              className="btn-primary btn-small"
              onClick={handleSaveKey}
              disabled={!loadedContent || !sheetId}
            >
              {t("googleSyncModal.saveKey")}
            </button>
            <button className="btn-primary btn-small" onClick={handleDeleteData}>
              {t("googleSyncModal.deleteData")}
            </button>
            <button className="btn-primary btn-small" onClick={onClose}>
              {t("googleSyncModal.close")}
            </button>
            {/* Dev-only Inspect button hidden by default */}
          </div>
        </div>
        {/* sheet input centered under actions */}
        <div className="sheet-input-row" style={{ justifyContent: "center", marginTop: 8 }}>
          <input
            placeholder={t("googleSyncModal.sheetIdPlaceholder")}
            value={sheetId ?? ""}
            onChange={(e) => setSheetId(e.target.value)}
            style={{ width: 360 }}
          />
        </div>
        <div style={{ marginTop: 12 }}>
          <div>
            {t("googleSyncModal.keyLabel")} {loadedFileName ?? t("googleSyncModal.none")}
          </div>
          <div>
            {t("googleSyncModal.sheetIdLabel")} {savedSheetId ?? t("googleSyncModal.none")}
          </div>
          {saveMessage && <div style={{ marginTop: 8 }}>{saveMessage}</div>}
          <div style={{ marginTop: 8 }}>
            <small>
              {t("googleSyncModal.autoSyncStatus", {
                status: googleSyncEnabled
                  ? t("googleSyncModal.enabled")
                  : t("googleSyncModal.disabled")
              })}
            </small>
          </div>
          {/* debugInfo removed */}
          {showSavedConfirm && (
            <div className="modal-confirmation">
              <div className="modal-confirmation-card">
                <div>{t("googleSyncModal.saved")}</div>
                <div style={{ marginTop: 8 }}>
                  <button
                    className="btn-primary btn-small"
                    onClick={() => {
                      setShowSavedConfirm(false);
                      onClose();
                    }}
                  >
                    {t("googleSyncModal.ok")}
                  </button>
                </div>
              </div>
            </div>
          )}
          {showDeletedConfirm && (
            <div className="modal-confirmation">
              <div className="modal-confirmation-card">
                <div>{t("googleSyncModal.deleted")}</div>
                <div style={{ marginTop: 8 }}>
                  <button
                    className="btn-primary btn-small"
                    onClick={() => {
                      setShowDeletedConfirm(false);
                      onClose();
                    }}
                  >
                    {t("googleSyncModal.ok")}
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
