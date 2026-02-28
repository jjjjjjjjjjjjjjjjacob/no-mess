"use client";

import { useQuery } from "convex/react";
import { Search, Store, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useFormContext } from "../form-context";

interface ShopifyProductFieldProps {
  value: string;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

export function ShopifyProductField({
  value,
  onChange,
  disabled,
}: ShopifyProductFieldProps) {
  const { siteId } = useFormContext();
  const products = useQuery(
    api.shopify.listProducts,
    siteId ? { siteId: siteId as Id<"sites"> } : "skip",
  );
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  if (!siteId) {
    return (
      <p className="text-sm text-muted-foreground">
        Shopify product picker not available (missing site context).
      </p>
    );
  }

  const selectedProduct = products?.find((p) => p.handle === value);
  const filteredProducts =
    products?.filter(
      (p) =>
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.handle.toLowerCase().includes(search.toLowerCase()),
    ) ?? [];

  if (value && selectedProduct) {
    return (
      <div className="flex items-center gap-3 rounded-lg border p-3">
        {selectedProduct.featuredImage ? (
          <img
            src={selectedProduct.featuredImage}
            alt={selectedProduct.title}
            className="h-10 w-10 rounded object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
            <Store className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium">
            {selectedProduct.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {selectedProduct.handle}
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
            placeholder="Search products..."
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
      {isOpen && filteredProducts.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
          {filteredProducts.slice(0, 10).map((product) => (
            <button
              key={product._id}
              type="button"
              className="flex w-full items-center gap-2 p-2 text-left text-sm hover:bg-muted/50"
              onClick={() => {
                onChange(product.handle);
                setIsOpen(false);
                setSearch("");
              }}
            >
              {product.featuredImage ? (
                <img
                  src={product.featuredImage}
                  alt={product.title}
                  className="h-8 w-8 rounded object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                  <Store className="h-3 w-3" />
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-medium">{product.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {product.handle}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
      {isOpen && search && filteredProducts.length === 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover p-3 text-center text-sm text-muted-foreground shadow-md">
          No products found
        </div>
      )}
    </div>
  );
}
