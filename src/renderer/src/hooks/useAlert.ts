import { useState } from "react";

type UseAlertReturn = {
  alertMessage: string;
  showAlert: boolean;
  showCustomAlert: (message: string) => void;
  closeAlert: () => void;
};

export const useAlert = (): UseAlertReturn => {
  const [alertMessage, setAlertMessage] = useState<string>("");
  const [showAlert, setShowAlert] = useState(false);

  const showCustomAlert = (message: string): void => {
    setAlertMessage(message);
    setShowAlert(true);
  };

  const closeAlert = (): void => {
    setShowAlert(false);
    setAlertMessage("");
  };

  return {
    alertMessage,
    showAlert,
    showCustomAlert,
    closeAlert
  };
};
