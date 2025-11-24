import { useState } from 'react'

type UseConfirmReturn = {
  confirmMessage: string
  showConfirm: boolean
  showCustomConfirm: (message: string, callback: () => void) => void
  closeConfirm: (confirmed: boolean) => void
}

export const useConfirm = (): UseConfirmReturn => {
  const [confirmMessage, setConfirmMessage] = useState<string>('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null)

  const showCustomConfirm = (message: string, callback: () => void): void => {
    setConfirmMessage(message)
    setConfirmCallback(() => callback)
    setShowConfirm(true)
  }

  const closeConfirm = (confirmed: boolean): void => {
    if (confirmed && confirmCallback) {
      confirmCallback()
    }
    setShowConfirm(false)
    setConfirmMessage('')
    setConfirmCallback(null)
  }

  return {
    confirmMessage,
    showConfirm,
    showCustomConfirm,
    closeConfirm
  }
}
