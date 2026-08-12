import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import s from "./Admin.module.css";
import page from "./AdminStoryEditor.module.css";
import { fetchStageByIdWithActivities, updateStage } from "../../lib/stages";
import { uploadStageImage } from "../../lib/stageImages";
import OverTypeEditor from "../../components/OverTypeEditor/OverTypeEditor";
import { ArrowLeftIcon, FloppyDiskIcon } from "@phosphor-icons/react";

// How long an unsaved change can sit before autosave picks it up, regardless
// of how long the user keeps typing (a debounce-on-every-keystroke would
// never fire during a long unbroken paragraph).
const AUTOSAVE_INTERVAL_MS = 5000;

export default function AdminStoryEditor() {
  const { stageId } = useParams();

  const [stage, setStage] = useState(null);
  const [body, setBody] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  // Refs so the interval/unmount effects below always see the latest values
  // without needing to re-run on every keystroke.
  const bodyRef = useRef("");
  const savedBodyRef = useRef("");
  const stageRef = useRef(null);
  const isSavingRef = useRef(false);

  useEffect(() => {
    bodyRef.current = body;
  }, [body]);
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    let isMounted = true;

    async function loadStage() {
      try {
        const stageRes = await fetchStageByIdWithActivities(stageId);
        if (!isMounted) return;
        setStage(stageRes);
        setBody(stageRes.body || "");
        savedBodyRef.current = stageRes.body || "";
      } catch (err) {
        console.error(err);
        if (!isMounted) return;
        setSaveError("Failed to load stage.");
      }
    }

    loadStage();
    return () => {
      isMounted = false;
    };
  }, [stageId]);

  async function saveBody(value) {
    const currentStage = stageRef.current;
    if (!currentStage || isSavingRef.current || value === savedBodyRef.current) {
      return;
    }
    isSavingRef.current = true;
    setIsSaving(true);
    setSaveError("");
    try {
      const updated = await updateStage(currentStage.id, { body: value });
      savedBodyRef.current = value;
      setStage((prev) => (prev ? { ...prev, ...updated } : prev));
      setSavedMsg("Saved.");
    } catch (err) {
      console.error(err);
      setSaveError("Could not save.");
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }

  async function handleSave() {
    await saveBody(body);
  }

  function handleChange(value) {
    setBody(value);
    setSavedMsg("");
  }

  // Periodic autosave — catches any unsaved change within AUTOSAVE_INTERVAL_MS.
  useEffect(() => {
    const interval = setInterval(() => {
      if (bodyRef.current !== savedBodyRef.current) saveBody(bodyRef.current);
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Best-effort save of any unsaved change on the way out (back button,
  // closing the tab, losing signal right after typing).
  useEffect(() => {
    return () => {
      if (bodyRef.current !== savedBodyRef.current && stageRef.current) {
        updateStage(stageRef.current.id, { body: bodyRef.current }).catch(
          (err) => console.error(err),
        );
      }
    };
  }, []);

  return (
    <div className={page.page}>
      <div className={page.header}>
        <div className={s.rowCentered}>
          <Link to={`/admin/stages/${stageId}`} className={s.backArrow}>
            <ArrowLeftIcon size={16} />
          </Link>
          <div className={s.crumb}>
            <small className={s.crumbEye}>Story</small>
            {stage?.name}
          </div>
        </div>
        <div className={s.rowCentered}>
          {savedMsg && <span className={s.statusMsg}>{savedMsg}</span>}
          {saveError && <span className={s.statusError}>{saveError}</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !stage}
          >
            {isSaving ? "Saving…" : <FloppyDiskIcon size={14} weight="bold" />}
          </button>
        </div>
      </div>

      <div className={page.editorWrap}>
        {stage && (
          <OverTypeEditor
            value={body}
            onChange={handleChange}
            onSave={handleSave}
            height="100%"
            onUploadImage={async (file) => {
              const { url } = await uploadStageImage(stage.id, file);
              return url;
            }}
          />
        )}
      </div>
    </div>
  );
}
