import { useEffect, useRef, useState } from "react";

const SNAP_H = {
  peek: () => 100,
  half: () => window.innerHeight * 0.3,
  full: () => window.innerHeight * 0.9,
};
const STATES = ["peek", "half", "full"];

export function useSheetDrag(initialState = "peek") {
  const [sheetState, setSheetState] = useState(initialState);
  const sheetRef = useRef(null);
  const bodyRef = useRef(null);
  const dragRef = useRef(null); // { startY, startH, pending? }
  const stateRef = useRef(sheetState);

  useEffect(() => {
    stateRef.current = sheetState;
  }, [sheetState]);

  // Prevent pull-to-refresh once an actual drag is underway
  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const prevent = (e) => {
      const d = dragRef.current;
      const inScrollableBody =
        bodyRef.current?.contains(e.target) && stateRef.current === "full";
      if (!inScrollableBody && d && !d.pending) e.preventDefault();
    };
    el.addEventListener("touchmove", prevent, { passive: false });
    return () => el.removeEventListener("touchmove", prevent);
  }, []);

  function snapTo(state) {
    const el = sheetRef.current;
    if (!el) return;
    el.style.transition = "";
    el.style.height = "";
    setSheetState(state);
  }

  function onPointerDown(e) {
    if (e.target.closest("button, a, input, select, textarea")) return;
    const el = sheetRef.current;
    if (!el) return;
    const startH = el.getBoundingClientRect().height;
    // Defer committing to a drag until the pointer actually moves, so a
    // plain tap on something like the heightmap toggle still clicks normally.
    dragRef.current = {
      startY: e.clientY,
      startH,
      pending: true,
      pointerId: e.pointerId,
    };
  }

  function onPointerMove(e) {
    const d = dragRef.current;
    if (!d) return;

    if (d.pending) {
      if (e.pointerId !== d.pointerId) return;
      const deltaY = e.clientY - d.startY;
      if (Math.abs(deltaY) < 5) return;

      const atScrollTop = (bodyRef.current?.scrollTop ?? 0) === 0;
      const canDrag = stateRef.current !== "full" || (deltaY > 0 && atScrollTop);

      if (canDrag) {
        e.currentTarget.setPointerCapture(d.pointerId);
        sheetRef.current.style.transition = "none";
        dragRef.current = { startY: d.startY, startH: d.startH };
      } else {
        dragRef.current = null;
      }
      return;
    }

    const delta = d.startY - e.clientY; // positive = dragging up
    const minH = SNAP_H[STATES[0]]();
    const maxH = SNAP_H[STATES[STATES.length - 1]]();
    const newH = Math.min(maxH, Math.max(minH, d.startH + delta));
    sheetRef.current.style.height = `${newH}px`;
  }

  function onPointerUp() {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || d.pending) return;

    const h = sheetRef.current?.getBoundingClientRect().height ?? 0;
    const target = STATES.reduce((best, s) =>
      Math.abs(SNAP_H[s]() - h) < Math.abs(SNAP_H[best]() - h) ? s : best
    );
    snapTo(target);
  }

  return {
    sheetState,
    setSheetState,
    snapTo,
    sheetRef,
    bodyRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
  };
}
