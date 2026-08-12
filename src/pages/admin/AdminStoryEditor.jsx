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

  const pageRef = useRef(null);

  useEffect(() => {
    bodyRef.current = body;
  }, [body]);
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  // Locks the outer page so it can never scroll — combined with the
  // visualViewport-driven height below, this is what stops both "the
  // controls scroll out of view" and "I can scroll past the bottom" on
  // mobile: with the document unable to scroll at all, the header can't
  // move and there's no room to overshoot past the content.
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, []);

  // iOS Safari doesn't shrink 100dvh when the on-screen keyboard opens — it
  // just overlays the page. Worse, the *visible* region also shifts down by
  // visualViewport.offsetTop without the document itself scrolling, so a
  // plain height fix still leaves content positioned for the wrong region
  // (a blank gap where the keyboard now covers what used to be visible).
  // Compensate for both directly via a transform, applied imperatively so
  // it stays in lockstep with the viewport instead of waiting on a re-render.
  useEffect(() => {
    const vv = window.visualViewport;

    function updateLayout() {
      const el = pageRef.current;
      if (!el) return;
      const height = vv ? vv.height : window.innerHeight;
      const offsetTop = vv ? vv.offsetTop : 0;
      el.style.height = `${height}px`;
      el.style.transform = offsetTop ? `translateY(${offsetTop}px)` : "";
    }

    updateLayout();
    vv?.addEventListener("resize", updateLayout);
    vv?.addEventListener("scroll", updateLayout);
    window.addEventListener("resize", updateLayout);
    return () => {
      vv?.removeEventListener("resize", updateLayout);
      vv?.removeEventListener("scroll", updateLayout);
      window.removeEventListener("resize", updateLayout);
    };
  }, []);

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
    <div ref={pageRef} className={page.page}>
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
            padding="0.65em"
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
