import React from 'react'

interface AlertProps {
  show: boolean
  message: string
  onClose: () => void
}

export const Alert: React.FC<AlertProps> = ({ show, message, onClose }) => {
  if (!show) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content alert-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-message">{message}</div>
        <div className="modal-actions">
          <button className="btn-primary" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
