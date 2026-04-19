import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { XIcon } from "@phosphor-icons/react";

import { fetchHaikuFromStageId } from "../../lib/haiku";
import { formatDateRange, formatDate } from "../../lib/stageFormatters";

import s from "./StageModal.module.css";

export default function StageModal({ stage, open, onClose }) {
  const [haikus, setHaikus] = useState([]);

  useEffect(() => {
    if (!stage?.id) return;
    fetchHaikuFromStageId(stage.id).then(setHaikus).catch(console.error);
  }, [stage?.id]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className={s.backdrop} onClick={onClose} role="presentation">
      <div
        className={s.dialog}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={stage?.name || "Stage story"}
      >
        <div className={s.header}>
          <div>
            {stage?.startDate && (
              <p className={s.date}>
                {formatDateRange(stage.startDate, stage.endDate)}
              </p>
            )}
            <h1 className={s.title}>{stage?.name}</h1>
          </div>
          <button className={s.close} onClick={onClose} aria-label="Close">
            <XIcon size={14} weight="bold" />
          </button>
        </div>

        <div className={s.body}>
          {haikus.length > 0 && (
            <div className={s.haikus}>
              {haikus.map((haiku) => (
                <div key={haiku.id} className={s.haiku}>
                  <label>{formatDate(haiku.date)}</label>
                  <p style={{ whiteSpace: "pre-line" }}>{haiku.text}</p>
                </div>
              ))}
            </div>
          )}

          {stage?.body && (
            <div className={s.story}>
              <ReactMarkdown>{stage.body}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
