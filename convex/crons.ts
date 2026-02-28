import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "shopify-auto-sync",
  { hours: 4 },
  internal.shopifySync.dispatchSyncCycle,
);

export default crons;
