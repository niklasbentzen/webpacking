import { useEffect, useRef, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  ArrowsHorizontalIcon,
  AtIcon,
  InstagramLogoIcon,
} from "@phosphor-icons/react";
import StageList from "../StageList/StageList";
import StageActivityPanel from "../StageActivityPanel/StageActivityPanel";
import Divider from "../Divider/Divider";
import { formatDateRange } from "../../lib/stageFormatters";
import s from "./MobileBottomSheet.module.css";

export default function MobileBottomSheet({
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
  onReadStory,
  isLoggedIn,
  logout,
  onLoginOpen,
}) {
  const [sheetState, setSheetState] = useState("peek");
  const isBackNavRef = useRef(false);
  const prevClickedRef = useRef(clickedStage);

  useEffect(() => {
    const wasNonNull = prevClickedRef.current !== null;
    prevClickedRef.current = clickedStage;

    if (clickedStage) {
      isBackNavRef.current = false;
      setSheetState("detail");
    } else if (wasNonNull && !isBackNavRef.current) {
      setSheetState("peek");
    }
  }, [clickedStage]);

  const handleBack = () => {
    isBackNavRef.current = true;
    setClickedStage(null);
    setSheetState("list");
  };

  return (
    <div className={s.sheet} data-state={sheetState}>
      <div
        className={s.handleArea}
        onClick={() => sheetState === "peek" && setSheetState("list")}
      >
        <div className={s.handle} />
      </div>

      {sheetState === "peek" && (
        <div className={s.peekContent} onClick={() => setSheetState("list")}>
          <span className={s.tripName}>{trip?.name}</span>
          <div className={s.peekStats}>
            {tripTotals?.distanceM != null && (
              <span>
                <ArrowsHorizontalIcon size={12} />{" "}
                {(tripTotals.distanceM / 1000).toFixed(1)} km
              </span>
            )}
            {tripTotals?.elevationM != null && (
              <span>
                <ArrowUpRightIcon size={12} />{" "}
                {tripTotals.elevationM.toFixed(0)} m
              </span>
            )}
          </div>
        </div>
      )}

      {sheetState !== "peek" && (
        <div className={s.inner}>
          {sheetState === "list" && (
            <>
              <section className={s.header}>
                {isLoggedIn ? (
                  <button onClick={logout}>Log out</button>
                ) : (
                  <button onClick={onLoginOpen}>Login</button>
                )}
                <div className={s.headerIcons}>
                  <a
                    href="https://www.instagram.com/bagfra/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <InstagramLogoIcon size={18} weight="bold" />
                  </a>
                  <a href="mailto:niklas@bentzen.it">
                    <AtIcon size={18} weight="bold" />
                  </a>
                </div>
              </section>
              <section>
                <h2>{trip?.name}</h2>
                <div className={s.tripData}>
                  {tripTotals?.startTime && (
                    <div className={s.tripDataItem}>
                      <span>
                        {formatDateRange(
                          tripTotals.startTime,
                          tripTotals.endTime,
                        )}
                      </span>
                    </div>
                  )}
                  {tripTotals?.distanceM != null && (
                    <div className={s.tripDataItem}>
                      <ArrowsHorizontalIcon size={14} />
                      <span>{(tripTotals.distanceM / 1000).toFixed(1)} km</span>
                    </div>
                  )}
                  {tripTotals?.elevationM != null && (
                    <div className={s.tripDataItem}>
                      <ArrowUpRightIcon size={14} />
                      {tripTotals.elevationM.toFixed(0)} m
                    </div>
                  )}
                </div>
                {trip?.description && <p>{trip.description}</p>}
              </section>
              <Divider />
              <section>
                <h2>
                  Stages <sup className={s.sup}>{stages.length}</sup>
                </h2>
                <StageList
                  stages={stages}
                  clickedStage={clickedStage}
                  setClickedStage={setClickedStage}
                  hoveredStage={hoveredStage}
                  setHoveredStage={setHoveredStage}
                />
              </section>
            </>
          )}

          {sheetState === "detail" && selectedStage && (
            <>
              <button className={s.backBtn} onClick={handleBack}>
                <ArrowLeftIcon size={16} />
                Back
              </button>
              <StageActivityPanel
                flat
                stage={selectedStage}
                mapRef={mapRef}
                selectedActivity={selectedActivity}
                setSelectedActivity={setSelectedActivity}
                onReadStory={onReadStory}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
