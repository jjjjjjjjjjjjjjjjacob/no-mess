"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "@/convex/_generated/api";

export function useSite() {
  const params = useParams<{ siteSlug: string }>();
  const site = useQuery(
    api.sites.getBySlug,
    params.siteSlug ? { slug: params.siteSlug } : "skip",
  );

  return {
    site,
    isLoading: site === undefined,
    siteSlug: params.siteSlug,
  };
}
