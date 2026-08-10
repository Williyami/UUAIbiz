import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, FileText } from "lucide-react";

/**
 * A downloadable document with an inline preview.
 *
 * The preview is an <iframe> rather than <embed>: browsers render PDFs in it
 * natively, and it degrades to a download prompt where they don't.
 */
export function DocumentCard({
  title,
  description,
  href,
  meta,
}: {
  title: string;
  description?: string;
  href: string;
  meta?: string;
}) {
  const [preview, setPreview] = useState(false);

  return (
    <div className="border bg-card">
      <div className="flex flex-wrap items-center gap-4 px-5 py-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[3px] bg-(--brand-red)/10 text-(--brand-red)">
          <FileText className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-display text-base font-medium tracking-tight">{title}</div>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          {meta && <p className="microlabel mt-1 text-[9.5px] text-muted-foreground/70">{meta}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setPreview((v) => !v)}>
            {preview ? "Hide preview" : "Preview"}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={href} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> Open
            </a>
          </Button>
          <Button size="sm" asChild>
            <a href={href} download>
              <Download className="h-3.5 w-3.5" /> Download
            </a>
          </Button>
        </div>
      </div>
      {preview && (
        <div className="border-t bg-muted/30 p-3">
          <iframe src={href} title={title} className="h-[70vh] w-full rounded-[3px] border" />
        </div>
      )}
    </div>
  );
}
