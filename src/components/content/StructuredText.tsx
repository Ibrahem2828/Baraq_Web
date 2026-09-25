import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Block =
  | { kind: "heading"; level: 2 | 3; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "paragraph"; text: string };

const HEADING = /^(#{2,3})\s+(.+)$/;
const BULLET = /^\s*(?:[-•*]|\d+[.)])\s+(.+)$/;

/** Blocks from the light structure the AI is asked for: "## " headings, "- " points, paragraphs. */
export function parseStructuredText(text: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  };
  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      flush();
      blocks.push({ kind: "heading", level: heading[1]!.length === 2 ? 2 : 3, text: heading[2]!.trim() });
      continue;
    }
    const bullet = BULLET.exec(line);
    if (bullet) {
      flush();
      const last = blocks[blocks.length - 1];
      if (last?.kind === "list") last.items.push(bullet[1]!.trim());
      else blocks.push({ kind: "list", items: [bullet[1]!.trim()] });
      continue;
    }
    paragraph.push(line);
  }
  flush();
  return blocks;
}

/** `**bold**` inside a line, rendered as text nodes (never HTML). */
function inline(text: string): ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <strong key={index} className="font-semibold text-[color:var(--color-ink)]">
        {part}
      </strong>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

/**
 * Long AI text as readable sections. Kholasa's detailed summary used to be one
 * `whitespace-pre-line` paragraph: headings and points arrived as raw "##" and
 * "-" characters in a wall of text.
 */
export function StructuredText({ text, className }: { text: string; className?: string }) {
  const blocks = parseStructuredText(text);
  return (
    <div className={cn("flex flex-col gap-3 text-sm leading-7 text-[color:var(--color-ink-soft)]", className)}>
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          const Heading = block.level === 2 ? "h3" : "h4";
          return (
            <Heading
              key={index}
              className={cn(
                "font-bold text-[color:var(--color-ink)]",
                block.level === 2 ? "mt-2 text-base first:mt-0" : "text-sm",
              )}
            >
              {inline(block.text)}
            </Heading>
          );
        }
        if (block.kind === "list") {
          return (
            <ul key={index} className="flex list-disc flex-col gap-1.5 ps-5 marker:text-[color:var(--color-accent)]">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{inline(item)}</li>
              ))}
            </ul>
          );
        }
        return <p key={index}>{inline(block.text)}</p>;
      })}
    </div>
  );
}
