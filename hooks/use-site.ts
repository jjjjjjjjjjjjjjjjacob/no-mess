"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "@/convex/_generated/api";

export function useSite() {
  const params = useParams<{ siteSlug?: string | string[] }>();
  const siteSlug = normalizeRouteParam(params.siteSlug);
  const site = useQuery(
    api.sites.getBySlug,
    siteSlug ? { slug: siteSlug } : "skip",
  );

  return {
    site,
    isLoading: site === undefined,
    siteSlug,
  };
}

function normalizeRouteParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}
