"use client";

import { useQuery } from "convex/react";
import { FolderOpen, Search, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useFormContext } from "../form-context";

interface ShopifyCollectionFieldProps {
  value: string;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

export function ShopifyCollectionField({
  value,
  onChange,
  disabled,
}: ShopifyCollectionFieldProps) {
  const { siteId } = useFormContext();
  const collections = useQuery(
    api.shopify.listCollections,
    siteId ? { siteId: siteId as Id<"sites"> } : "skip",
  );
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  if (!siteId) {
    return (
      <p className="text-sm text-muted-foreground">
        Shopify collection picker not available (missing site context).
      </p>
    );
  }

  const selectedCollection = collections?.find((c) => c.handle === value);
  const filteredCollections =
    collections?.filter(
      (c) =>
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.handle.toLowerCase().includes(search.toLowerCase()),
    ) ?? [];

  if (value && selectedCollection) {
    return (
      <div className="flex items-center gap-3 rounded-lg border p-3">
        {selectedCollection.image ? (
          <img
            src={selectedCollection.image}
            alt={selectedCollection.title}
            className="h-10 w-10 rounded object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium">
            {selectedCollection.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {selectedCollection.handle}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onChange("")}
          disabled={disabled}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search collections..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            disabled={disabled}
            className="pl-9"
          />
        </div>
      </div>
      {isOpen && filteredCollections.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
          {filteredCollections.slice(0, 10).map((collection) => (
            <button
              key={collection._id}
              type="button"
              className="flex w-full items-center gap-2 p-2 text-left text-sm hover:bg-muted/50"
              onClick={() => {
                onChange(collection.handle);
                setIsOpen(false);
                setSearch("");
              }}
            >
              {collection.image ? (
                <img
                  src={collection.image}
                  alt={collection.title}
                  className="h-8 w-8 rounded object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                  <FolderOpen className="h-3 w-3" />
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-medium">{collection.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {collection.handle}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
      {isOpen && search && filteredCollections.length === 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover p-3 text-center text-sm text-muted-foreground shadow-md">
          No collections found
        </div>
      )}
    </div>
  );
}
