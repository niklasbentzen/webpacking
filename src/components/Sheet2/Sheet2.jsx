import s from "./Sheet2.module.css";
import {
  ArrowsHorizontalIcon,
  ArrowUpRightIcon,
  BookIcon,
  CaretLineDownIcon,
  XIcon,
} from "@phosphor-icons/react";
import { formatDateRange } from "@/lib/stageFormatters";
import StageList from "../StageList/StageList";
import Story from "../Story/Story";
import { useSheetDrag } from "@/lib/hooks/useSheetDrag";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import StageActivityPanel from "../StageActivityPanel/StageActivityPanel";
import { useEffect } from "react";

export default function Sheet2({
  trip,
  tripTotals,
  stages,
  clickedStage,
  setClickedStage,
  hoveredStage,
  setHoveredStage,
  selectedActivity,
  setSelectedActivity,
  mapRef,
}) {
  const isMobile = useMediaQuery("(max-width: 960px)");
  const selectedStage = stages.find((s) => s.id === clickedStage) ?? null;
  const {
    sheetState,
    snapTo,
    sheetRef,
    bodyRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  } = useSheetDrag("peek");

  useEffect(() => {
    if (!isMobile && clickedStage) snapTo("half");
  }, [clickedStage, isMobile]);

  if (!isMobile && !clickedStage) {
    return <></>;
  }

  return (
    <div
      className={`${s.sheet} ${s[sheetState]}`}
      ref={sheetRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {isMobile && (
        <div className={s.dragHandle}>
          <div className={s.dragPill}></div>
        </div>
      )}

      {!isMobile && (
        <div className={s.navigation}>
          {sheetState === "full" ? (
            <button onClick={() => snapTo("half")}>
              <CaretLineDownIcon size={16} />
            </button>
          ) : (
            <button onClick={() => snapTo("full")}>
              <BookIcon size={16} />
            </button>
          )}
          <button onClick={() => setClickedStage(null)}>
            <XIcon size={16} />
          </button>
        </div>
      )}

      <div className={s.header}>
        {!clickedStage ? (
          <>
            <h2>{trip?.name}</h2>
            <div className={s.stats}>
              {tripTotals?.startTime && (
                <div>
                  <span>
                    {formatDateRange(tripTotals.startTime, tripTotals.endTime)}
                  </span>
                </div>
              )}
              {tripTotals?.distanceM != null && (
                <div>
                  <ArrowsHorizontalIcon size={14} />
                  <span>{(tripTotals.distanceM / 1000).toFixed(1)} km</span>
                </div>
              )}
              {tripTotals?.elevationM != null && (
                <div>
                  <ArrowUpRightIcon size={14} />
                  {tripTotals.elevationM.toFixed(0)} m
                </div>
              )}
            </div>
          </>
        ) : (
          <h2>{selectedStage?.name}</h2>
        )}
      </div>

      <div className={`${s.content} ${s[sheetState]}`} ref={bodyRef}>
        {!clickedStage ? (
          <>
            {trip?.description && (
              <p className={s.description}>{trip.description}</p>
            )}
            <h2 className={s.stageListHeading}>
              Stages<sup className={s.sup}>{stages.length}</sup>
            </h2>
            <StageList
              stages={stages}
              clickedStage={clickedStage}
              setClickedStage={setClickedStage}
              hoveredStage={hoveredStage}
              setHoveredStage={setHoveredStage}
              scroll={false}
            />
          </>
        ) : (
          <>
            <StageActivityPanel
              flat
              stage={selectedStage}
              mapRef={mapRef}
              selectedActivity={selectedActivity}
              setSelectedActivity={setSelectedActivity}
            />

            {sheetState === "full" && <Story stage={selectedStage} />}
          </>
        )}
      </div>
      <button
        className={s.expandStoryButton}
        onClick={() => snapTo(sheetState === "full" ? "half" : "full")}
      >
        {sheetState === "full" ? "Collapse story" : "Read the story"}
      </button>
    </div>
  );
}
