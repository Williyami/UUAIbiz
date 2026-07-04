import React from "react";

/**
 * Minimal markdown renderer for Info sections. Supports #/## headings,
 * "- " bullet lists, blank-line paragraphs, **bold**, *italic*, `code`
 * and [text](url) links. Renders React elements only — no raw HTML.
 */
export function Markdown({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = (text || "").replace(/\r\n/g, "\n").split("\n");
  let para: string[] = [];
  let list: string[] = [];
  let key = 0;

  const flushPara = () => {
    if (para.length) {
      blocks.push(
        <p key={key++} className="text-sm leading-relaxed">
          {renderInline(para.join(" "))}
        </p>,
      );
      para = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      blocks.push(
        <ul key={key++} className="space-y-1.5 text-sm leading-relaxed">
          {list.map((item, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="mt-[7px] h-[5px] w-[5px] shrink-0 bg-brand" />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>,
      );
      list = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const h = line.match(/^(#{1,3})\s+(.*)/);
    if (h) {
      flushPara();
      flushList();
      blocks.push(
        <h4 key={key++} className="microlabel pt-2 text-[10.5px] text-foreground/80">
          {renderInline(h[2])}
        </h4>,
      );
      continue;
    }
    const li = line.match(/^[-*]\s+(.*)/);
    if (li) {
      flushPara();
      list.push(li[1]);
      continue;
    }
    if (line.trim() === "") {
      flushPara();
      flushList();
      continue;
    }
    flushList();
    para.push(line.trim());
  }
  flushPara();
  flushList();

  return <div className="space-y-3">{blocks}</div>;
}

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g);
  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
      return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`"))
      return (
        <code key={i} className="bg-muted px-1 py-0.5 font-mono text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      );
    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      const href = /^https?:\/\//i.test(link[2]) ? link[2] : undefined;
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-brand underline underline-offset-2"
        >
          {link[1]}
        </a>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}
