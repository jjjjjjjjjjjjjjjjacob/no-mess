"use client";

import { useMutation } from "convex/react";
import { Check, Copy, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Separator } from "@/components/ui/separator";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useSite } from "@/hooks/use-site";

export default function SiteSettingsPage() {
  const router = useRouter();
  const { site } = useSite();
  const updateSite = useMutation(api.sites.update);
  const removeSite = useMutation(api.sites.remove);
  const regenerateApiKey = useMutation(api.sites.regenerateApiKey);
  const regeneratePublishableKey = useMutation(
    api.sites.regeneratePublishableKey,
  );
  const regeneratePreviewSecret = useMutation(
    api.sites.regeneratePreviewSecret,
  );
  const { copied: apiKeyCopied, copy: copyApiKey } = useCopyToClipboard();
  const { copied: pubKeyCopied, copy: copyPubKey } = useCopyToClipboard();
  const { copied: secretCopied, copy: copySecret } = useCopyToClipboard();

  const [name, setName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [nameInitialized, setNameInitialized] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRegenerateApiKeyDialog, setShowRegenerateApiKeyDialog] =
    useState(false);
  const [
    showRegeneratePublishableKeyDialog,
    setShowRegeneratePublishableKeyDialog,
  ] = useState(false);
  const [
    showRegeneratePreviewSecretDialog,
    setShowRegeneratePreviewSecretDialog,
  ] = useState(false);

  // Initialize form values from site
  if (site && !nameInitialized) {
    setName(site.name);
    setPreviewUrl(site.previewUrl ?? "");
    setNameInitialized(true);
  }

  if (!site) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSite({
        siteId: site._id as Id<"sites">,
        name: name.trim(),
        previewUrl: previewUrl.trim() || undefined,
      });
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await removeSite({ siteId: site._id as Id<"sites"> });
      toast.success("Site deleted");
      router.push("/");
    } catch {
      toast.error("Failed to delete site");
      setIsDeleting(false);
    }
  };

  const handleRegenerateApiKey = async () => {
    try {
      await regenerateApiKey({ siteId: site._id as Id<"sites"> });
      toast.success("API key regenerated");
    } catch {
      toast.error("Failed to regenerate API key");
    }
  };

  const handleRegeneratePublishableKey = async () => {
    try {
      await regeneratePublishableKey({ siteId: site._id as Id<"sites"> });
      toast.success("Publishable key regenerated");
    } catch {
      toast.error("Failed to regenerate publishable key");
    }
  };

  const handleRegeneratePreviewSecret = async () => {
    try {
      await regeneratePreviewSecret({ siteId: site._id as Id<"sites"> });
      toast.success("Preview secret regenerated");
    } catch {
      toast.error("Failed to regenerate preview secret");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Basic site settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="settings-name">Site name</Label>
            <Input
              id="settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <Input value={site.slug} disabled />
            <p className="text-xs text-muted-foreground">
              The slug cannot be changed after creation.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-preview-url">Preview URL</Label>
            <Input
              id="settings-preview-url"
              placeholder="https://mysite.com"
              value={previewUrl}
              onChange={(e) => setPreviewUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Used for preview links when editing content.
            </p>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Secret Key</CardTitle>
          <CardDescription>
            Server-side only. Never expose in client-side code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={site.apiKey} readOnly className="font-mono text-sm" />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyApiKey(site.apiKey)}
            >
              {apiKeyCopied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRegenerateApiKeyDialog(true)}
          >
            <RefreshCw className="mr-2 h-3 w-3" />
            Regenerate
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Publishable Key</CardTitle>
          <CardDescription>
            Safe for client-side use. Read-only access to published content.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={site.publishableKey ?? "Not generated yet"}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                site.publishableKey && copyPubKey(site.publishableKey)
              }
              disabled={!site.publishableKey}
            >
              {pubKeyCopied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRegeneratePublishableKeyDialog(true)}
          >
            <RefreshCw className="mr-2 h-3 w-3" />
            Regenerate
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview Secret</CardTitle>
          <CardDescription>
            Used for preview mode authentication.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={site.previewSecret}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copySecret(site.previewSecret)}
            >
              {secretCopied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRegeneratePreviewSecretDialog(true)}
          >
            <RefreshCw className="mr-2 h-3 w-3" />
            Regenerate
          </Button>
        </CardContent>
      </Card>

      <Separator />

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Permanently delete this site and all its content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            disabled={isDeleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? "Deleting..." : "Delete Site"}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete site</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this site? This will permanently
              remove the site and all its content. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showRegenerateApiKeyDialog}
        onOpenChange={setShowRegenerateApiKeyDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate secret key</AlertDialogTitle>
            <AlertDialogDescription>
              Regenerating the secret key will break any existing server-side
              integrations. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRegenerateApiKey}>
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showRegeneratePublishableKeyDialog}
        onOpenChange={setShowRegeneratePublishableKeyDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate publishable key</AlertDialogTitle>
            <AlertDialogDescription>
              Regenerating the publishable key will break any existing
              client-side integrations. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRegeneratePublishableKey}>
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showRegeneratePreviewSecretDialog}
        onOpenChange={setShowRegeneratePreviewSecretDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate preview secret</AlertDialogTitle>
            <AlertDialogDescription>
              Regenerating the preview secret will break any existing preview
              integrations. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRegeneratePreviewSecret}>
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
