import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { currentUserQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/PageHeader";
import { AvatarCropDialog } from "@/components/layout/AvatarCropDialog";
import { initials } from "@/lib/format";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(currentUserQuery);
  },
  component: SettingsPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">Error: {error.message}</div>,
});

function SettingsPage() {
  const qc = useQueryClient();
  const { data: me } = useSuspenseQuery(currentUserQuery);
  const [name, setName] = useState(me?.profile?.name ?? "");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const saveName = useMutation({
    mutationFn: async () => {
      if (!me) throw new Error("Not signed in");
      const { error } = await supabase
        .from("profiles")
        .update({ name: name.trim() })
        .eq("id", me.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["currentUser"] });
      qc.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Name updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  function onFilePicked(file: File) {
    setCropSrc(URL.createObjectURL(file));
  }

  async function onCropped(blob: Blob) {
    if (!me) return;
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setUploading(true);
    try {
      const path = `${me.id}/avatar.png`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/png" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${pub.publicUrl}?t=${Date.now()}`;
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", me.id);
      if (profErr) throw profErr;
      qc.invalidateQueries({ queryKey: ["currentUser"] });
      qc.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Profile picture updated");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 p-6 md:p-10">
      <PageHeader title="Settings" lede="Your name, profile picture and password." />

      <section className="space-y-5 border bg-card p-5">
        <div className="flex items-center gap-4">
          {me?.profile?.avatar_url ? (
            <img
              src={me.profile.avatar_url}
              alt=""
              className="h-16 w-16 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-foreground/85 font-mono text-lg font-semibold uppercase text-background">
              {initials(me?.profile?.name || me?.email)}
            </div>
          )}
          <div className="space-y-1.5">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFilePicked(f);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? "Uploading…" : "Change picture"}
            </Button>
            <p className="microlabel text-[9.5px] text-muted-foreground/70">
              You can crop and zoom before saving
            </p>
          </div>
        </div>

        <div className="space-y-1.5 border-t pt-5">
          <Label className="microlabel text-muted-foreground">Full name</Label>
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <Button
              disabled={saveName.isPending || !name.trim() || name === me?.profile?.name}
              onClick={() => saveName.mutate()}
            >
              {saveName.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>

        <div className="space-y-1.5 border-t pt-5">
          <Label className="microlabel text-muted-foreground">Email</Label>
          <div className="font-mono text-xs text-muted-foreground">{me?.email}</div>
        </div>

        <div className="border-t pt-5">
          <Button variant="outline" size="sm" asChild>
            <Link to="/auth/change-password">
              <KeyRound className="h-3.5 w-3.5" /> Change password
            </Link>
          </Button>
        </div>
      </section>

      <AvatarCropDialog
        imageSrc={cropSrc}
        onCancel={() => {
          if (cropSrc) URL.revokeObjectURL(cropSrc);
          setCropSrc(null);
        }}
        onCropped={onCropped}
      />
    </div>
  );
}
