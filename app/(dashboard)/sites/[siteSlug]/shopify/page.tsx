"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { CheckCircle, RefreshCw, Store, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useSite } from "@/hooks/use-site";

export default function ShopifyPage() {
  const { site } = useSite();
  const updateSite = useMutation(api.sites.update);
  const testConnection = useAction(api.shopify.testShopifyConnection);
  const syncProducts = useAction(api.shopify.syncProducts);
  const syncCollections = useAction(api.shopify.syncCollections);
  const products = useQuery(
    api.shopify.listProducts,
    site ? { siteId: site._id } : "skip",
  );
  const collections = useQuery(
    api.shopify.listCollections,
    site ? { siteId: site._id } : "skip",
  );

  const [domain, setDomain] = useState("");
  const [token, setToken] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    shopName?: string;
    error?: string;
  } | null>(null);
  const [syncResult, setSyncResult] = useState<{
    products: number;
    collections: number;
  } | null>(null);

  if (site && !initialized) {
    setDomain(site.shopifyDomain ?? "");
    setToken(site.shopifyToken ?? "");
    setInitialized(true);
  }

  if (!site) return null;

  const handleTestConnection = async () => {
    if (!domain.trim() || !token.trim()) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testConnection({
        domain: domain.trim(),
        token: token.trim(),
      });
      setTestResult(result);
    } catch {
      setTestResult({ success: false, error: "Connection test failed" });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSite({
        siteId: site._id as Id<"sites">,
        shopifyDomain: domain.trim() || undefined,
        shopifyToken: token.trim() || undefined,
      });
      toast.success("Shopify credentials saved");
    } catch {
      toast.error("Failed to save credentials");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const [productResult, collectionResult] = await Promise.all([
        syncProducts({ siteId: site._id as Id<"sites"> }),
        syncCollections({ siteId: site._id as Id<"sites"> }),
      ]);
      const result = {
        products: productResult.synced,
        collections: collectionResult.synced,
      };
      setSyncResult(result);
      toast.success(
        `Synced ${result.products} products and ${result.collections} collections`,
      );
    } catch {
      toast.error("Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const isConnected = !!site.shopifyDomain && !!site.shopifyToken;

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Shopify Connection
          </CardTitle>
          <CardDescription>
            Connect your Shopify store to sync products.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shopify-domain">Store Domain</Label>
            <Input
              id="shopify-domain"
              placeholder="mystore.myshopify.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Your Shopify store&apos;s .myshopify.com domain.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="shopify-token">Storefront Access Token</Label>
            <Input
              id="shopify-token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Private access token from your Shopify Headless channel.
            </p>
          </div>

          {testResult && (
            <div
              className={`flex items-center gap-2 text-sm ${testResult.success ? "text-primary" : "text-destructive"}`}
            >
              {testResult.success ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Connected to {testResult.shopName}
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  {testResult.error}
                </>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting || !domain.trim() || !token.trim()}
            >
              {isTesting ? "Testing..." : "Test Connection"}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Shopify Sync</CardTitle>
            <CardDescription>
              Sync products and collections from your Shopify store.
              {site.shopifyLastSyncAt && (
                <span className="ml-1">
                  Last synced:{" "}
                  {new Date(site.shopifyLastSyncAt).toLocaleString()}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Button onClick={handleSync} disabled={isSyncing}>
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
                />
                {isSyncing ? "Syncing..." : "Sync Products & Collections"}
              </Button>
              {syncResult && (
                <span className="text-sm text-muted-foreground">
                  Synced {syncResult.products} products,{" "}
                  {syncResult.collections} collections
                </span>
              )}
            </div>

            {products === undefined ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className="divide-y rounded-lg border">
                {products.slice(0, 20).map((product) => (
                  <div
                    key={product._id}
                    className="flex items-center gap-3 p-3"
                  >
                    {product.featuredImage ? (
                      <img
                        src={product.featuredImage}
                        alt={product.title}
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                        <Store className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">
                        {product.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {product.handle}
                      </p>
                    </div>
                    <Badge
                      variant={
                        product.status === "active" ? "default" : "secondary"
                      }
                    >
                      {product.status}
                    </Badge>
                  </div>
                ))}
                {products.length > 20 && (
                  <p className="p-3 text-center text-sm text-muted-foreground">
                    ...and {products.length - 20} more
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No products synced yet. Click &quot;Sync Products &amp;
                Collections&quot; to import.
              </p>
            )}

            <h3 className="pt-4 text-sm font-semibold">Collections</h3>
            {collections === undefined ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : collections.length > 0 ? (
              <div className="divide-y rounded-lg border">
                {collections.map((collection) => (
                  <div
                    key={collection._id}
                    className="flex items-center gap-3 p-3"
                  >
                    {collection.image ? (
                      <img
                        src={collection.image}
                        alt={collection.title}
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                        <Store className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">
                        {collection.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {collection.handle}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {collection.productsCount} products
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No collections synced yet.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
