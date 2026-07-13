import { useState } from "react";
import s from "../../pages/admin/Admin.module.css";
import { updateHaiku } from "../../lib/haiku";

export default function AdminEditHaiku({ haiku, setHaikus }) {
  const [date, setDate] = useState(
    haiku?.date ? new Date(haiku.date).toISOString().slice(0, 10) : "",
  );
  const [text, setText] = useState(haiku?.text || "");

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function handleSave() {
    setIsSaving(true);
    setSaveError("");
    try {
      const updated = await updateHaiku(haiku.id, {
        text,
        date: date ? new Date(date).toISOString() : null,
      });
      setHaikus((prev) => prev.map((h) => (h.id === haiku.id ? updated : h)));
    } catch (err) {
      console.error(err);
      setSaveError("Could not save haiku.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={s.modal}>
      <div className={s.field}>
        <label htmlFor="haikuDate">Date</label>
        <input
          id="haikuDate"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={isSaving}
        />
      </div>

      <div className={s.field}>
        <label htmlFor="haikuText">Haiku</label>
        <textarea
          id="haikuText"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isSaving}
        />
      </div>

      <div className={s.row}>
        <button type="button" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving…" : "Save"}
        </button>
        {saveError && <span className={s.statusError}>{saveError}</span>}
      </div>
    </div>
  );
}
