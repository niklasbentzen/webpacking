import React, { useEffect } from "react";
import s from "./Modal.module.css";
import { CrossIcon, XIcon } from "@phosphor-icons/react";

export default function Modal({ open, title, onClose, children }) {
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
          <div className={s.close} onClick={onClose} aria-label="Close">
            <XIcon size={18} />
          </div>
        </div>

        <div className={s.content}></div>
        {children}
      </div>
    </div>
  );
}
