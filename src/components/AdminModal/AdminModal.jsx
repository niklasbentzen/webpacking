import React, { useEffect } from "react";
import { XIcon } from "@phosphor-icons/react";
import s from "./AdminModal.module.css";

export default function AdminModal({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e) {
      if (e.key === "Escape") onClose?.();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={s.backdrop} onClick={onClose} role="presentation">
      <div
        className={s.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title || "Modal"}
      >
        <span className={s.grab} aria-hidden="true" />

        <div className={s.header}>
          <h3 className={s.title}>{title}</h3>
          <button type="button" className={s.closeBtn} onClick={onClose} aria-label="Close">
            <XIcon size={16} weight="bold" />
          </button>
        </div>

        <div className={s.content}>
          {children}
        </div>
      </div>
    </div>
  );
}
