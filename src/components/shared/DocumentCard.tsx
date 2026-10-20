import { Button } from "@/components/ui/button";
import { Download, ExternalLink, FileText } from "lucide-react";

/**
 * A downloadable document with its preview always on show.
 *
 * The preview is an <iframe> rather than <embed>: browsers render PDFs in it
 * natively, and it degrades to a download prompt where they don't. The
 * fragment asks the viewer to fit the page width and hide its toolbar.
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
  return (
    <div className="flex h-full flex-col border bg-card">
      <div className="flex items-start gap-3 px-5 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-(--brand-red)/10 text-(--brand-red)">
          <FileText className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-display text-base font-medium tracking-tight">{title}</div>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          {meta && <p className="microlabel mt-1 text-[9.5px] text-muted-foreground/70">{meta}</p>}
        </div>
      </div>
      <div className="flex-1 border-y bg-muted/30 p-3">
        <iframe
          src={`${href}#view=FitH&toolbar=0&navpanes=0`}
          title={`${title} preview`}
          loading="lazy"
          className="h-[520px] w-full rounded-md border bg-background"
        />
      </div>
      <div className="flex items-center justify-end gap-1.5 px-5 py-3">
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
  );
}
