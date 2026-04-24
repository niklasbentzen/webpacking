import { useEffect, useRef, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  ArrowsHorizontalIcon,
  AtIcon,
  BookIcon,
  CaretDownIcon,
  CaretUpIcon,
  ChartLineIcon,
  InstagramLogoIcon,
  XIcon,
} from "@phosphor-icons/react";
import StageList from "../StageList/StageList";
import StageActivityPanel from "../StageActivityPanel/StageActivityPanel";
import Divider from "../Divider/Divider";
import { formatDateRange } from "../../lib/stageFormatters";
import { useMediaQuery } from "../../lib/hooks/useMediaQuery";
import s from "./Sheet.module.css";
import Story from "../Story/Story";

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
  isLoggedIn,
  logout,
  onLoginOpen,
}) {
  const isDesktop = useMediaQuery("(min-width: 961px)");
  const [sheetState, setSheetState] = useState(() =>
    window.matchMedia("(min-width: 961px)").matches ? "closed" : "peek",
  );
  const isBackNavRef = useRef(false);
  const prevClickedRef = useRef(clickedStage);
  const [isStory, setIsStory] = useState(false);

  useEffect(() => {
    if (isDesktop) {
      setSheetState(clickedStage ? "stage" : "closed");
      return;
    }

    const wasNonNull = prevClickedRef.current !== null;
    prevClickedRef.current = clickedStage;

    if (clickedStage) {
      isBackNavRef.current = false;
      setSheetState("stage");
    } else if (wasNonNull && !isBackNavRef.current) {
      setSheetState("peek");
    }
  }, [clickedStage, isDesktop]);

  const handleBack = () => {
    isBackNavRef.current = true;
    setClickedStage(null);
    setSheetState(isDesktop ? "closed" : "trip");
  };

  return (
    <div className={s.sheet} data-state={sheetState}>
      {!isDesktop && sheetState !== "stage" && (
        <div
          className={s.sheetHandle}
          onClick={() => {
            if (sheetState === "peek") setSheetState("trip");
            else if (sheetState === "trip") setSheetState("peek");
          }}
        >
          {sheetState === "peek" ? (
            <CaretUpIcon size={18} weight="bold" />
          ) : (
            <CaretDownIcon size={18} weight="bold" />
          )}
        </div>
      )}

      <div className={s.sheetHeader}>
        {sheetState === "peek" && (
          <div className={s.peekHeader} onClick={() => setSheetState("trip")}>
            <h2>{trip?.name}</h2>
            <div className={s.peekStats}>
              {tripTotals?.startTime && (
                <div className={s.tripMetaItem}>
                  {formatDateRange(tripTotals.startTime, tripTotals.endTime)}
                </div>
              )}
              {tripTotals?.distanceM != null && (
                <span>
                  <ArrowsHorizontalIcon size={14} />
                  {(tripTotals.distanceM / 1000).toFixed(1)} km
                </span>
              )}
              {tripTotals?.elevationM != null && (
                <span>
                  <ArrowUpRightIcon size={14} />
                  {tripTotals.elevationM.toFixed(0)} m
                </span>
              )}
            </div>
          </div>
        )}

        {sheetState === "trip" && (
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

        {sheetState === "stage" && selectedStage && (
          <div className={s.stageHeader}>
            <button className={s.back} onClick={handleBack}>
              {isDesktop ? (
                <>
                  <XIcon size={16} />
                  Close
                </>
              ) : (
                <>
                  <ArrowLeftIcon size={16} />
                  Back
                </>
              )}
            </button>
            <h3>{selectedStage.name}</h3>
            <button
              className={s.storyToggle}
              onClick={() => setIsStory(!isStory)}
            >
              {isStory ? (
                <>
                  <ChartLineIcon size={16} />
                  Statistics
                </>
              ) : (
                <>
                  <BookIcon size={16} />
                  Story
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {(sheetState === "trip" || sheetState === "stage") && (
        <div className={s.sheetBody}>
          {sheetState === "trip" && (
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
          {sheetState === "stage" &&
            selectedStage &&
            (isStory ? (
              <Story stage={selectedStage} />
            ) : (
              <StageActivityPanel
                flat
                stage={selectedStage}
                mapRef={mapRef}
                selectedActivity={selectedActivity}
                setSelectedActivity={setSelectedActivity}
                onReadStory={() => setIsStory(true)}
              />
            ))}
        </div>
      )}
    </div>
  );
}
