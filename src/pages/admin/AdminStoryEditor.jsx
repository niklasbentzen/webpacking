import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import s from "./Admin.module.css";
import page from "./AdminStoryEditor.module.css";
import { fetchStageByIdWithActivities, updateStage } from "../../lib/stages";
import { uploadStageImage } from "../../lib/stageImages";
import OverTypeEditor from "../../components/OverTypeEditor/OverTypeEditor";
import { ArrowLeftIcon, FloppyDiskIcon } from "@phosphor-icons/react";

export default function AdminStoryEditor() {
  const { stageId } = useParams();

  const [stage, setStage] = useState(null);
  const [body, setBody] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadStage() {
      try {
        const stageRes = await fetchStageByIdWithActivities(stageId);
        if (!isMounted) return;
        setStage(stageRes);
        setBody(stageRes.body || "");
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

  async function handleSave() {
    if (!stage) return;
    setIsSaving(true);
    setSaveError("");
    setSavedMsg("");
    try {
      const updated = await updateStage(stage.id, { body });
      setStage((prev) => ({ ...prev, ...updated }));
      setSavedMsg("Saved.");
    } catch (err) {
      console.error(err);
      setSaveError("Could not save.");
    } finally {
      setIsSaving(false);
    }
  }

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
            onChange={setBody}
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
