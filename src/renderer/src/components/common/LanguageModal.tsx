import React from "react";
import { useTranslation } from "../../contexts/I18nContext";

interface LanguageModalProps {
  show: boolean;
  onClose: () => void;
}

export const LanguageModal: React.FC<LanguageModalProps> = ({ show, onClose }) => {
  const { language, setLanguage, t } = useTranslation();

  const languages = [
    { code: "en" as const, name: "English", flag: "🇺🇸" },
    { code: "ja" as const, name: "日本語", flag: "🇯🇵" }
  ];

  if (!show) return null;

  const handleLanguageSelect = (langCode: "en" | "ja"): void => {
    setLanguage(langCode);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-message">
          <h2>{t("options.language")}</h2>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              alignItems: "center"
            }}
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                className={`btn-primary ${language === lang.code ? "active" : ""}`}
                onClick={() => handleLanguageSelect(lang.code)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  fontSize: "16px",
                  width: "50%",
                  background:
                    language === lang.code
                      ? "rgba(100, 150, 255, 0.2)"
                      : "rgba(255, 255, 255, 0.05)",
                  border:
                    language === lang.code
                      ? "2px solid rgba(100, 150, 255, 0.6)"
                      : "1px solid rgba(255, 255, 255, 0.1)"
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "1.5em" }}>{lang.flag}</span>
                  <span>{lang.name}</span>
                </span>
                {language === lang.code && (
                  <span style={{ color: "rgba(100, 150, 255, 1)", fontSize: "1.2em" }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-primary" onClick={onClose}>
            {t("googleSyncModal.close")}
          </button>
        </div>
      </div>
    </div>
  );
};
