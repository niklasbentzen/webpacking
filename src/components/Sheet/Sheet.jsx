import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  ArrowUpRightIcon,
  ArrowsHorizontalIcon,
  XIcon,
} from "@phosphor-icons/react";
import StageList from "../StageList/StageList";
import StageActivityPanel from "../StageActivityPanel/StageActivityPanel";
import { formatDateRange } from "../../lib/stageFormatters";
import { useMediaQuery } from "../../lib/hooks/useMediaQuery";
import s from "./Sheet.module.css";
import Story from "../Story/Story";

function getSnapPx(state) {
  const vh = window.innerHeight;
  return (
    {
      "trip-peek": 100,
      "trip-half": vh * 0.4,
      "trip-full": vh * 0.9,
      "stage-peek": 80,
      "stage-half": vh * 0.4,
      "stage-full": vh * 0.9,
    }[state] ?? 0
  );
}

function getSheetMaxPx() {
  return window.innerHeight * 0.9;
}

function visibleToTranslate(visiblePx) {
  return Math.max(0, getSheetMaxPx() - visiblePx);
}

export default function Sheet({
  trip,
  tripTotals,
  stages,
  clickedStage,
  setClickedStage,
  hoveredStage,
  setHoveredStage,
  selectedStage,
  selectedActivity,
  setSelectedActivity,
  mapRef,
}) {
  const isDesktop = useMediaQuery("(min-width: 961px)");
  const [sheetState, setSheetState] = useState(() =>
    window.matchMedia("(min-width: 961px)").matches ? "closed" : "trip-peek",
  );

  const sheetRef = useRef(null);
  const sheetBodyRef = useRef(null);
  const prevTripStateRef = useRef("trip-peek");
  const sheetStateRef = useRef(sheetState);
  const isFirstRenderRef = useRef(true);
  // Active drag state
  const dragRef = useRef(null);
  // Pending state for "decide on first move" (full state body touches)
  const pendingDragRef = useRef(null);

  useEffect(() => {
    sheetStateRef.current = sheetState;
  }, [sheetState]);

  // Mobile: apply translateY on snap state change (no transition on first render)
  useLayoutEffect(() => {
    if (!sheetRef.current || isDesktop) return;
    const el = sheetRef.current;
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      el.style.transition = "none";
    } else {
      el.style.transition = "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)";
    }
    el.style.transform = `translateY(${visibleToTranslate(getSnapPx(sheetState))}px)`;
  }, [sheetState, isDesktop]);

  // Prevent page scroll and pull-to-refresh while touching the sheet.
  // Pointer events handle the drag, but the browser still interprets the touch
  // as a page scroll gesture unless we explicitly cancel it here. Preventing
  // touchmove default does NOT cancel pointermove (they're independent).
  useEffect(() => {
    const el = sheetRef.current;
    if (!el || isDesktop) return;
    const prevent = (e) => {
      const inScrollableBody =
        sheetBodyRef.current?.contains(e.target) &&
        sheetStateRef.current.endsWith("-full");
      if (!inScrollableBody) e.preventDefault();
    };
    el.addEventListener("touchmove", prevent, { passive: false });
    return () => el.removeEventListener("touchmove", prevent);
  }, [isDesktop]);

  // Desktop: show/hide based on stage selection
  useEffect(() => {
    if (!isDesktop) return;
    setSheetState(clickedStage ? "stage" : "closed");
  }, [clickedStage, isDesktop]);

  // Mobile: transition to stage-half when a stage is clicked
  useEffect(() => {
    if (isDesktop) return;
    if (clickedStage) {
      const cur = sheetStateRef.current;
      if (!cur.startsWith("stage")) prevTripStateRef.current = cur;
      setSheetState("stage-half");
    }
  }, [clickedStage, isDesktop]);

  const handleBack = useCallback(() => {
    setClickedStage(null);
    setSheetState(
      isDesktop ? "closed" : (prevTripStateRef.current ?? "trip-peek"),
    );
  }, [isDesktop, setClickedStage]);

  // ── Snap on release ───────────────────────────────────────

  const snapFromCurrentPosition = useCallback((endClientY) => {
    const el = sheetRef.current;
    if (!el || !dragRef.current) return;

    const match = el.style.transform?.match(/translateY\(([0-9.]+)px\)/);
    const ty = match ? parseFloat(match[1]) : 0;
    const currentVisible = getSheetMaxPx() - ty;
    const totalDrag = Math.abs(dragRef.current.startY - endClientY);
    const positions = dragRef.current.positions;
    dragRef.current = null;

    // Velocity from last 100ms (positive = upward)
    const now = Date.now();
    const recent = positions.filter((p) => now - p.time < 100);
    let velocity = 0;
    if (recent.length >= 2) {
      const first = recent[0];
      const last = recent[recent.length - 1];
      const dt = last.time - first.time;
      if (dt > 0) velocity = (first.y - last.y) / dt;
    }

    const cur = sheetStateRef.current;
    const states = cur.startsWith("stage")
      ? ["stage-peek", "stage-half", "stage-full"]
      : ["trip-peek", "trip-half", "trip-full"];

    let target;
    if (totalDrag < 5) {
      // Tap: advance from peek states
      if (cur === "trip-peek") target = "trip-half";
      else if (cur === "stage-peek") target = "stage-half";
      else target = cur;
    } else if (Math.abs(velocity) > 0.4) {
      const idx = states.indexOf(cur);
      target =
        velocity > 0
          ? states[Math.min(states.length - 1, idx + 1)]
          : states[Math.max(0, idx - 1)];
    } else {
      target = states.reduce((best, st) =>
        Math.abs(getSnapPx(st) - currentVisible) <
        Math.abs(getSnapPx(best) - currentVisible)
          ? st
          : best,
      );
    }

    el.style.transition = "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)";
    el.style.transform = `translateY(${visibleToTranslate(getSnapPx(target))}px)`;
    setSheetState(target);
  }, []);

  // ── Unified sheet-level drag handlers ────────────────────
  // When NOT at full state, overflow-y: hidden on the body means there's
  // nothing for the browser to scroll — so the whole sheet surface drags.
  // When AT full state, body scrolls normally; we only take over when the
  // scroll is at the top and the user pulls down (to dismiss/shrink).

  const handleSheetPointerDown = useCallback(
    (e) => {
      if (isDesktop || !sheetRef.current) return;

      const cur = sheetStateRef.current;
      const isFullState = cur.endsWith("-full");
      const isDragHandle = e.target.closest("[data-drag-handle]") !== null;

      if (!isFullState || isDragHandle) {
        // Immediate capture: non-full state or explicit handle touch
        e.currentTarget.setPointerCapture(e.pointerId);
        const el = sheetRef.current;
        const match = el.style.transform?.match(/translateY\(([0-9.]+)px\)/);
        const ty = match
          ? parseFloat(match[1])
          : visibleToTranslate(getSnapPx(cur));
        el.style.transition = "none";
        dragRef.current = {
          startY: e.clientY,
          startVisible: getSheetMaxPx() - ty,
          positions: [{ y: e.clientY, time: Date.now() }],
        };
      } else {
        // Full state body touch: wait for direction before deciding
        pendingDragRef.current = {
          pointerId: e.pointerId,
          startY: e.clientY,
          startX: e.clientX,
        };
      }
    },
    [isDesktop],
  );

  const handleSheetPointerMove = useCallback(
    (e) => {
      if (isDesktop) return;

      // ── Active drag ──────────────────────────────────────
      if (dragRef.current) {
        const el = sheetRef.current;
        if (!el) return;
        const delta = dragRef.current.startY - e.clientY;
        const newVisible = Math.min(
          getSheetMaxPx(),
          Math.max(50, dragRef.current.startVisible + delta),
        );
        el.style.transform = `translateY(${visibleToTranslate(newVisible)}px)`;
        const pos = dragRef.current.positions;
        pos.push({ y: e.clientY, time: Date.now() });
        if (pos.length > 8) pos.shift();
        return;
      }

      // ── Pending: decide whether to drag or let scroll ────
      const pending = pendingDragRef.current;
      if (!pending || e.pointerId !== pending.pointerId) return;

      const deltaY = pending.startY - e.clientY; // positive = moving up
      const deltaX = Math.abs(pending.startX - e.clientX);

      if (Math.abs(deltaY) < 3 && deltaX < 3) return; // wait for clear intent

      if (deltaX > Math.abs(deltaY)) {
        // Horizontal swipe — ignore
        pendingDragRef.current = null;
        return;
      }

      const movingDown = deltaY < 0;
      const bodyScrollTop = sheetBodyRef.current?.scrollTop ?? 0;

      if (bodyScrollTop === 0 && movingDown) {
        // At scroll top pulling down → drag the sheet
        pendingDragRef.current = null;
        e.currentTarget.setPointerCapture(pending.pointerId);

        const el = sheetRef.current;
        const match = el.style.transform?.match(/translateY\(([0-9.]+)px\)/);
        const ty = match
          ? parseFloat(match[1])
          : visibleToTranslate(getSnapPx(sheetStateRef.current));
        el.style.transition = "none";
        dragRef.current = {
          startY: pending.startY,
          startVisible: getSheetMaxPx() - ty,
          positions: [
            { y: pending.startY, time: Date.now() },
            { y: e.clientY, time: Date.now() },
          ],
        };

        // Apply this move immediately
        const delta = pending.startY - e.clientY;
        const newVisible = Math.min(
          getSheetMaxPx(),
          Math.max(50, dragRef.current.startVisible + delta),
        );
        el.style.transform = `translateY(${visibleToTranslate(newVisible)}px)`;
      } else {
        // Moving up or body not at top — let scroll happen
        pendingDragRef.current = null;
      }
    },
    [isDesktop],
  );

  const handleSheetPointerEnd = useCallback(
    (e) => {
      pendingDragRef.current = null;
      if (dragRef.current) snapFromCurrentPosition(e.clientY);
    },
    [snapFromCurrentPosition],
  );

  const showStageContent = !!selectedStage && sheetState.startsWith("stage");

  return (
    <div
      className={s.sheet}
      ref={sheetRef}
      data-state={sheetState}
      data-desktop={isDesktop ? "" : undefined}
      onPointerDown={!isDesktop ? handleSheetPointerDown : undefined}
      onPointerMove={!isDesktop ? handleSheetPointerMove : undefined}
      onPointerUp={!isDesktop ? handleSheetPointerEnd : undefined}
      onPointerCancel={!isDesktop ? handleSheetPointerEnd : undefined}
    >
      {/* Visual drag handle — mobile only */}
      {!isDesktop && (
        <div className={s.dragHandle} data-drag-handle="">
          <div className={s.dragPill} />
        </div>
      )}

      {/* Header */}
      <div className={s.sheetHeader}>
        {!isDesktop && sheetState.startsWith("trip") && (
          <div className={s.tripHeader}>
            <h2>{trip?.name}</h2>
            <div className={s.tripMeta}>
              {tripTotals?.startTime && (
                <div className={s.tripMetaItem}>
                  <span>
                    {formatDateRange(tripTotals.startTime, tripTotals.endTime)}
                  </span>
                </div>
              )}
              {tripTotals?.distanceM != null && (
                <div className={s.tripMetaItem}>
                  <ArrowsHorizontalIcon size={14} />
                  <span>{(tripTotals.distanceM / 1000).toFixed(1)} km</span>
                </div>
              )}
              {tripTotals?.elevationM != null && (
                <div className={s.tripMetaItem}>
                  <ArrowUpRightIcon size={14} />
                  {tripTotals.elevationM.toFixed(0)} m
                </div>
              )}
            </div>
          </div>
        )}

        {showStageContent && (
          <div className={s.stageHeader}>
            <h3>{selectedStage.name}</h3>
            <button className={s.closeButton} onClick={handleBack}>
              <XIcon size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <div className={s.sheetBody} ref={sheetBodyRef}>
        {/* Mobile trip content */}
        {!isDesktop && sheetState.startsWith("trip") && (
          <>
            {trip?.description && (
              <p className={s.tripDescription}>{trip.description}</p>
            )}
            <h2 className={s.stagesHeading}>
              Stages<sup className={s.sup}>{stages.length}</sup>
            </h2>
            <StageList
              stages={stages}
              clickedStage={clickedStage}
              setClickedStage={setClickedStage}
              hoveredStage={hoveredStage}
              setHoveredStage={setHoveredStage}
            />
          </>
        )}

        {/* Stage content (mobile + desktop) */}
        {showStageContent && (
          <>
            <div className={isDesktop ? s.stickyPanel : undefined}>
              <StageActivityPanel
                flat
                stage={selectedStage}
                mapRef={mapRef}
                selectedActivity={selectedActivity}
                setSelectedActivity={setSelectedActivity}
                onReadStory={
                  !isDesktop ? () => setSheetState("stage-full") : null
                }
              />
            </div>
            <div className={s.storySection}>
              <Story stage={selectedStage} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
