import React, { useEffect, useRef, useState } from "react";

interface OptionsMenuProps {
  onExport: () => void;
  onImport: () => void;
}

export const OptionsMenu: React.FC<OptionsMenuProps> = ({ onExport, onImport }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

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
          <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z"></path>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09c.7 0 1.24-.44 1.51-1A1.65 1.65 0 0 0 4.6 6.6l-.06-.06A2 2 0 1 1 7.37 3.7l.06.06c.27.3.82.46 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09c.7 0 1.24.44 1.51 1A1.65 1.65 0 0 0 16.4 5l.06.06a2 2 0 1 1 2.83 2.83l-.06.06c-.18.18-.24.44-.33.7.06.27.18.52.33.7z"></path>
        </svg>
        Options ▾
      </button>
      {open && (
        <div className="options-dropdown">
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
            Export
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
            Import
          </div>
        </div>
      )}
    </div>
  );
};
