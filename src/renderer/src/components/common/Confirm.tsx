import React from 'react'

interface ConfirmProps {
  show: boolean
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export const Confirm: React.FC<ConfirmProps> = ({ show, message, onConfirm, onCancel }) => {
  if (!show) return null

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-message">{message}</div>
        <div className="modal-actions">
          <button className="btn-delete" onClick={onConfirm}>
            Yes
          </button>
          <button className="btn-delete" onClick={onCancel}>
            No
          </button>
        </div>
      </div>
    </div>
  )
}
