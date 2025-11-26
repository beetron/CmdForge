import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "../../contexts/I18nContext";
import { LanguageModal } from "./LanguageModal";

interface OptionsMenuProps {
  onExport: () => void;
  onImport: () => void;
  onGoogleSync?: () => void;
  onDeleteAll?: () => void;
}

export const OptionsMenu: React.FC<OptionsMenuProps> = ({
  onExport,
  onImport,
  onGoogleSync,
  onDeleteAll
}) => {
  const [open, setOpen] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const onClick = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  return (
    <div className="options-menu" ref={ref}>
      <button
        className="options-button btn-secondary"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <svg
          className="options-icon"
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"></path>
          <path d="M10.5 1.5h3a.5.5 0 0 1 .5.5v1.63a6 6 0 0 1 1.95 1.12l1.15-1.15a.5.5 0 0 1 .707 0l2.121 2.121a.5.5 0 0 1 0 .707l-1.15 1.15a6 6 0 0 1 1.12 1.95h1.63a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-.5.5h-1.63a6 6 0 0 1-1.12 1.95l1.15 1.15a.5.5 0 0 1 0 .707l-2.121 2.121a.5.5 0 0 1-.707 0l-1.15-1.15a6 6 0 0 1-1.95 1.12v1.63a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1.63a6 6 0 0 1-1.95-1.12l-1.15 1.15a.5.5 0 0 1-.707 0L2.379 19.37a.5.5 0 0 1 0-.707l1.15-1.15a6 6 0 0 1-1.12-1.95H1a.5.5 0 0 1-.5-.5v-3a.5.5 0 0 1 .5-.5h1.63a6 6 0 0 1 1.12-1.95l-1.15-1.15a.5.5 0 0 1 0-.707L5.121 5.75a.5.5 0 0 1 .707 0l1.15 1.15a6 6 0 0 1 1.95-1.12V2a.5.5 0 0 1 .5-.5z"></path>
        </svg>
        {t("options.menu")} ▾
      </button>
      {open && (
        <div className="options-dropdown">
          <div
            className="options-item"
            role="button"
            tabIndex={0}
            onClick={() => {
              setOpen(false);
              onGoogleSync?.();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setOpen(false);
                onGoogleSync?.();
              }
            }}
          >
            <svg
              className="options-item-icon"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M20 17.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 16.25" />
              <path d="M16 16l-4-4-4 4" />
            </svg>
            {t("sync.googleSync")}
          </div>
          <div
            className="options-item"
            role="button"
            tabIndex={0}
            onClick={() => {
              setOpen(false);
              onExport();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setOpen(false);
                onExport();
              }
            }}
          >
            <svg
              className="options-item-icon"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {t("options.export")}
          </div>

          <div
            className="options-item"
            role="button"
            tabIndex={0}
            onClick={() => {
              setOpen(false);
              onImport();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setOpen(false);
                onImport();
              }
            }}
          >
            <svg
              className="options-item-icon"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <polyline points="7 15 12 10 17 15" />
              <line x1="12" y1="3" x2="12" y2="17" />
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            </svg>
            {t("options.import")}
          </div>

          <div
            className="options-item"
            role="button"
            tabIndex={0}
            onClick={() => {
              setOpen(false);
              onDeleteAll?.();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setOpen(false);
                onDeleteAll?.();
              }
            }}
          >
            <svg
              className="options-item-icon"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
            {t("options.deleteAll")}
          </div>

          {/* Language selector */}
          <div
            className="options-item"
            role="button"
            tabIndex={0}
            onClick={() => {
              setOpen(false);
              setShowLanguageModal(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setOpen(false);
                setShowLanguageModal(true);
              }
            }}
          >
            <svg
              className="options-item-icon"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            {t("options.language")}
          </div>
        </div>
      )}
      <LanguageModal show={showLanguageModal} onClose={() => setShowLanguageModal(false)} />
    </div>
  );
};
