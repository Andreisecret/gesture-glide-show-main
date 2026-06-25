import { FileWarning, ExternalLink } from "lucide-react";

export function PptxHelp({ fileName }: { fileName?: string }) {
  return (
    <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-5">
      <div className="flex items-start gap-3">
        <FileWarning className="mt-0.5 size-5 shrink-0 text-yellow-500" />
        <div className="flex-1 space-y-3">
          <div>
            <div className="font-mono text-sm text-foreground">
              {fileName ? <>“{fileName}” is a .pptx file.</> : <>PowerPoint .pptx files</>}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              GestureDeck renders slides client-side and .pptx can't be parsed reliably in the browser.
              Convert to PDF or open it via Google Slides — both take ~15 seconds.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <a
              href="https://www.office.com/launch/powerpoint"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-between rounded-md border border-border bg-background/60 px-3 py-2 text-xs font-medium transition-colors hover:border-primary/60"
            >
              <span>PowerPoint Online → Export PDF</span>
              <ExternalLink className="size-3.5 text-muted-foreground" />
            </a>
            <a
              href="https://cloudconvert.com/pptx-to-pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-between rounded-md border border-green-500 bg-green-500/5 px-3 py-2 text-xs font-medium transition-colors hover:bg-green-500/10"
            >
              <span className="flex items-center gap-1.5">
                CloudConvert .pptx → .pdf
                <span className="rounded-full bg-green-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">Recommended</span>
              </span>
              <ExternalLink className="size-3.5 text-muted-foreground" />
            </a>
            <a
              href="https://slides.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-between rounded-md border border-border bg-background/60 px-3 py-2 text-xs font-medium transition-colors hover:border-primary/60"
            >
              <span>Import to Google Slides</span>
              <ExternalLink className="size-3.5 text-muted-foreground" />
            </a>
          </div>
          <p className="text-[11px] text-muted-foreground">
            After converting, drop the PDF here. Or, if you uploaded to Google Slides, use{" "}
            <a href="/google" className="text-primary underline-offset-2 hover:underline">
              Open from Google Slides
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
