import React, { useEffect } from "react";
import s from "./AdminModal.module.css";
import a from "../../pages/admin/Admin.module.css";

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
        <div className={s.header}>
          <h3 className={s.title}>{title}</h3>
          <button type="button" className={a.secondary} onClick={onClose}>
            Close
          </button>
        </div>

        <div className={s.content}></div>
        {children}
      </div>
    </div>
  );
}
