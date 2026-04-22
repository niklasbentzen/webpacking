import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

import { fetchHaikuFromStageId } from "../../lib/haiku";
import { formatDate } from "../../lib/stageFormatters";

import s from "./Story.module.css";

export default function Story({ stage }) {
  const [haikus, setHaikus] = useState([]);

  useEffect(() => {
    if (!stage?.id) return;
    fetchHaikuFromStageId(stage.id).then(setHaikus).catch(console.error);
  }, [stage?.id]);

  return (
    <>
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
    </>
  );
}
