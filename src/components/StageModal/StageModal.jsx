import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

import Modal from "../Modal/Modal";
import { fetchHaikuFromStageId } from "../../lib/haiku";
import { formatDateRange } from "../../lib/stageFormatters";

import s from "./StageModal.module.css";

export default function StageModal({ stage, open, onClose }) {
  const [haikus, setHaikus] = useState([]);

  useEffect(() => {
    if (!stage?.id) return;
    fetchHaikuFromStageId(stage.id).then(setHaikus).catch(console.error);
  }, [stage?.id]);

  return (
    <Modal open={open} title={stage?.name} onClose={onClose}>
      <div className={s.body}>
        {stage?.startDate && (
          <p className={s.date}>
            {formatDateRange(stage.startDate, stage.endDate)}
          </p>
        )}

        {haikus.length > 0 && (
          <div className={s.haikus}>
            {haikus.map((haiku) => (
              <div key={haiku.id} className={s.haiku}>
                <label>
                  {new Date(haiku.date).toLocaleDateString("en-GB", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </label>
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
    </Modal>
  );
}
