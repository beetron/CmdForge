import { useState } from "react";

type UseCopyToClipboardReturn = {
  copiedId: number | null;
  copyToClipboard: (text: string, id?: number) => void;
};

export const useCopyToClipboard = (): UseCopyToClipboardReturn => {
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const copyToClipboard = (text: string, id?: number): void => {
    navigator.clipboard.writeText(text).then(() => {
      if (id) {
        setCopiedId(id);
        setTimeout(() => {
          setCopiedId(null);
        }, 2000);
      }
    });
  };

  return {
    copiedId,
    copyToClipboard
  };
};
