import PocketBase from "pocketbase";

export const pb = new PocketBase(
  import.meta.env.VITE_PB_URL || window.location.origin,
);

// Prevent React dev-mode double renders from cancelling requests
pb.autoCancellation(false);
