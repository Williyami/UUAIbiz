import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { AvatarCropDialog } from "@/components/layout/AvatarCropDialog";
import { initials } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/auth_/setup-profile")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
  },
  component: SetupProfilePage,
});

function SetupProfilePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setName((data.user?.user_metadata as any)?.name || data.user?.email || "");
    });
  }, []);

  async function onCropped(blob: Blob) {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const path = `${u.user.id}/avatar.png`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/png" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${pub.publicUrl}?t=${Date.now()}`;
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", u.user.id);
      if (profErr) throw profErr;
      qc.invalidateQueries({ queryKey: ["currentUser"] });
      qc.invalidateQueries({ queryKey: ["profiles"] });
      setAvatarUrl(url);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <AuthLayout
      heading="Add a profile picture"
      sub="So the team recognises you around the hub — you can change it later in Settings."
    >
      <div className="space-y-6">
        <div className="flex items-center gap-5">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-20 w-20 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-foreground/85 font-mono text-xl font-semibold uppercase text-background">
              {initials(name)}
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
                if (f) setCropSrc(URL.createObjectURL(f));
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? "Uploading…" : avatarUrl ? "Change picture" : "Choose picture"}
            </Button>
            <p className="microlabel text-[9.5px] text-muted-foreground/70">
              You can crop and zoom before saving
            </p>
          </div>
        </div>
        <Button
          className="w-full"
          disabled={!avatarUrl || uploading}
          onClick={() => navigate({ to: "/dashboard" })}
        >
          Continue
        </Button>
        <p className="microlabel pt-1 text-center text-[10px] text-muted-foreground/70">
          <button
            type="button"
            onClick={() => navigate({ to: "/dashboard" })}
            className="underline underline-offset-2 hover:text-foreground"
          >
            Skip for now
          </button>
        </p>
      </div>
      <AvatarCropDialog
        imageSrc={cropSrc}
        onCancel={() => {
          if (cropSrc) URL.revokeObjectURL(cropSrc);
          setCropSrc(null);
        }}
        onCropped={onCropped}
      />
    </AuthLayout>
  );
}
