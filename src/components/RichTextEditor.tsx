"use client";

import * as React from "react";

type RichTextEditorProps = {
  value: string;
  onChange: (nextHtml: string) => void;
  placeholder?: string;
  minHeightClassName?: string;
  disabled?: boolean;
  className?: string;
  onUploadImage?: (file: File) => Promise<string>;
};

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "ul",
  "ol",
  "li",
  "code",
  "pre",
  "hr",
  "a",
  "img",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel"]),
  img: new Set(["src", "alt", "title"]),
};

function isProbablyHtml(input: string) {
  // Heuristic: if it contains an HTML tag, treat it as HTML.
  return /<\/?[a-z][\s\S]*>/i.test(input);
}

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function coerceToHtml(value: string) {
  const raw = (value ?? "").toString();
  if (!raw.trim()) return "";
  if (isProbablyHtml(raw)) return raw;

  // Treat as plain text: turn blank-line blocks into paragraphs.
  const normalized = raw.replaceAll("\r\n", "\n");
  const paras = normalized.split(/\n{2,}/g);
  return paras
    .map((p) => `<p>${escapeHtml(p).replaceAll("\n", "<br>")}</p>`)
    .join("");
}

function isSafeUrl(url: string) {
  const u = url.trim();
  if (!u) return false;
  // Allow relative URLs and fragments
  if (u.startsWith("/") || u.startsWith("#")) return true;
  try {
    const parsed = new URL(u);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function sanitizeRichHtml(inputHtml: string) {
  const html = (inputHtml ?? "").toString();
  if (!html.trim()) return "";

  if (typeof window === "undefined") {
    // SSR safety: don't attempt DOM parsing.
    // Renderers using this should be client components anyway.
    return "";
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
  const nodes: Element[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Element);

  for (const el of nodes) {
    const tag = el.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      // Replace disallowed elements with their text content.
      const text = doc.createTextNode(el.textContent ?? "");
      el.replaceWith(text);
      continue;
    }

    // Strip all attrs not in allowlist and remove event handlers/styles.
    for (const { name, value } of Array.from(el.attributes)) {
      const attr = name.toLowerCase();
      const allowed = ALLOWED_ATTRS[tag]?.has(attr) ?? false;
      if (!allowed) {
        el.removeAttribute(name);
        continue;
      }

      if (tag === "a" && attr === "href") {
        if (!isSafeUrl(value)) el.removeAttribute("href");
      }

      if (tag === "img" && attr === "src") {
        if (!isSafeUrl(value)) el.removeAttribute("src");
      }
    }

    if (tag === "a") {
      const href = el.getAttribute("href") ?? "";
      if (href && !href.startsWith("/") && !href.startsWith("#")) {
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noreferrer noopener");
      } else {
        el.removeAttribute("target");
        el.removeAttribute("rel");
      }
    }
  }

  // Normalize legacy tags for nicer output.
  doc.querySelectorAll("b").forEach((b) => {
    const strong = doc.createElement("strong");
    strong.append(...Array.from(b.childNodes));
    b.replaceWith(strong);
  });
  doc.querySelectorAll("i").forEach((i) => {
    const em = doc.createElement("em");
    em.append(...Array.from(i.childNodes));
    i.replaceWith(em);
  });

  return doc.body.innerHTML;
}

function getSelectionText() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return "";
  return sel.toString();
}

function exec(cmd: string, value?: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    return document.execCommand(cmd, false, value);
  } catch {
    return false;
  }
}

function insertHtml(html: string) {
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  document.execCommand("insertHTML", false, html);
}

function normalizeLinkUrl(raw: string) {
  const u = raw.trim();
  if (!u) return "";
  if (u.startsWith("/") || u.startsWith("#")) return u;
  if (/^https?:\/\//i.test(u)) return u;
  // If it looks like a domain, prepend https.
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/?#].*)?$/i.test(u)) return `https://${u}`;
  return u;
}

export function RichHtml({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const [safe, setSafe] = React.useState("");

  React.useEffect(() => {
    setSafe(sanitizeRichHtml(coerceToHtml(html)));
  }, [html]);

  if (!safe.trim()) return null;

  return <div className={className} dangerouslySetInnerHTML={{ __html: safe }} />;
}

export function RichSpan({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const [safe, setSafe] = React.useState("");

  React.useEffect(() => {
    setSafe(sanitizeRichHtml(coerceToHtml(html)));
  }, [html]);

  if (!safe.trim()) return null;

  return <span className={className} dangerouslySetInnerHTML={{ __html: safe }} />;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write something…",
  minHeightClassName = "min-h-[320px]",
  disabled = false,
  className,
  onUploadImage,
}: RichTextEditorProps) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const editorRef = React.useRef<HTMLDivElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const lastPropValueRef = React.useRef<string>("");
  const [isFocused, setIsFocused] = React.useState(false);
  const [isUploadingImage, setIsUploadingImage] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  const htmlValue = React.useMemo(() => coerceToHtml(value), [value]);
  const isEmpty = React.useMemo(() => {
    const stripped = htmlValue
      .replaceAll(/<br\s*\/?>/gi, "")
      .replaceAll(/<\/?p[^>]*>/gi, "")
      .replaceAll(/&nbsp;/gi, " ")
      .replaceAll(/\s+/g, " ")
      .trim();
    return !stripped;
  }, [htmlValue]);

  React.useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    // Avoid clobbering cursor while typing.
    const next = htmlValue;
    const prev = lastPropValueRef.current;
    if (next === prev) return;

    lastPropValueRef.current = next;
    if (isFocused) return;
    if (el.innerHTML !== next) el.innerHTML = next;
  }, [htmlValue, isFocused]);

  const emit = React.useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const next = el.innerHTML;
    onChange(next);
  }, [onChange]);

  const run = React.useCallback(
    (action: string, arg?: string) => {
      if (disabled) return;
      editorRef.current?.focus();
      if (action === "format") {
        exec("formatBlock", arg);
      } else if (action === "link") {
        const selected = getSelectionText().trim();
        const url = normalizeLinkUrl(prompt("Link URL (https://… or /path):") ?? "");
        if (!url) return;
        if (!isSafeUrl(url)) return;
        if (selected) {
          insertHtml(`<a href="${escapeHtml(url)}">${escapeHtml(selected)}</a>`);
        } else {
          insertHtml(`<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`);
        }
      } else if (action === "image") {
        if (onUploadImage) {
          setUploadError(null);
          fileInputRef.current?.click();
          return;
        }
        const url = normalizeLinkUrl(prompt("Image URL (https://… or /path):") ?? "");
        if (!url) return;
        if (!isSafeUrl(url)) return;
        insertHtml(`<img src="${escapeHtml(url)}" alt="" />`);
      } else if (action === "inlineCode") {
        const selected = getSelectionText();
        if (selected) {
          insertHtml(`<code>${escapeHtml(selected)}</code>`);
        } else {
          insertHtml(`<code></code>`);
        }
      } else if (action === "hr") {
        insertHtml("<hr>");
      } else if (action === "clear") {
        exec("removeFormat");
        exec("formatBlock", "p");
      } else {
        exec(action, arg);
      }
      emit();
    },
    [disabled, emit, onUploadImage],
  );

  return (
    <div
      ref={rootRef}
      className={[
        "rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950",
        disabled ? "opacity-60" : "",
        className ?? "",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200 p-2 dark:border-zinc-800">
        <ToolbarButton disabled={disabled} onClick={() => run("undo")} label="Undo">
          Undo
        </ToolbarButton>
        <ToolbarButton disabled={disabled} onClick={() => run("redo")} label="Redo">
          Redo
        </ToolbarButton>
        <div className="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-800" />
        <select
          disabled={disabled}
          className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-xs outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950"
          defaultValue="p"
          onChange={(e) => run("format", e.target.value)}
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="blockquote">Quote</option>
          <option value="pre">Code block</option>
        </select>
        <div className="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-800" />
        <ToolbarButton disabled={disabled} onClick={() => run("bold")} label="Bold">
          B
        </ToolbarButton>
        <ToolbarButton disabled={disabled} onClick={() => run("italic")} label="Italic">
          I
        </ToolbarButton>
        <ToolbarButton disabled={disabled} onClick={() => run("underline")} label="Underline">
          U
        </ToolbarButton>
        <ToolbarButton disabled={disabled} onClick={() => run("strikeThrough")} label="Strikethrough">
          S
        </ToolbarButton>
        <ToolbarButton disabled={disabled} onClick={() => run("inlineCode")} label="Inline code">
          {"</>"}
        </ToolbarButton>
        <div className="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-800" />
        <ToolbarButton disabled={disabled} onClick={() => run("insertUnorderedList")} label="Bulleted list">
          • List
        </ToolbarButton>
        <ToolbarButton disabled={disabled} onClick={() => run("insertOrderedList")} label="Numbered list">
          1. List
        </ToolbarButton>
        <div className="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-800" />
        <ToolbarButton disabled={disabled} onClick={() => run("link")} label="Insert link">
          Link
        </ToolbarButton>
        <ToolbarButton
          disabled={disabled || (Boolean(onUploadImage) && isUploadingImage)}
          onClick={() => run("image")}
          label={onUploadImage ? "Upload image" : "Insert image"}
        >
          {onUploadImage ? (isUploadingImage ? "Uploading…" : "Upload image") : "Image"}
        </ToolbarButton>
        <ToolbarButton disabled={disabled} onClick={() => run("hr")} label="Horizontal rule">
          HR
        </ToolbarButton>
        <div className="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-800" />
        <ToolbarButton disabled={disabled} onClick={() => run("clear")} label="Clear formatting">
          Clear
        </ToolbarButton>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0] ?? null;
          // Allow selecting the same file twice in a row.
          e.target.value = "";
          if (!file) return;
          if (!onUploadImage) return;
          if (disabled) return;
          setIsUploadingImage(true);
          setUploadError(null);
          try {
            const url = await onUploadImage(file);
            if (!url || !isSafeUrl(url)) throw new Error("Upload returned an invalid URL");
            editorRef.current?.focus();
            insertHtml(`<img src="${escapeHtml(url)}" alt="" />`);
            emit();
          } catch (err) {
            setUploadError(err instanceof Error ? err.message : "Upload failed");
          } finally {
            setIsUploadingImage(false);
          }
        }}
      />

      {uploadError ? (
        <div className="border-b border-zinc-200 px-4 py-2 text-xs text-red-600 dark:border-zinc-800 dark:text-red-400">
          {uploadError}
        </div>
      ) : null}

      <div className="relative">
        {isEmpty && !isFocused ? (
          <div className="pointer-events-none absolute left-4 top-3 text-sm text-zinc-400">
            {placeholder}
          </div>
        ) : null}
        <div
          ref={editorRef}
          className={[
            minHeightClassName,
            "prose prose-zinc max-w-none px-4 py-3 text-sm leading-6 outline-none",
            "dark:prose-invert",
          ].join(" ")}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            emit();
          }}
          onInput={emit}
          onKeyDown={(e) => {
            if (!disabled && (e.metaKey || e.ctrlKey)) {
              const k = e.key.toLowerCase();
              if (k === "b") {
                e.preventDefault();
                run("bold");
              }
              if (k === "i") {
                e.preventDefault();
                run("italic");
              }
              if (k === "u") {
                e.preventDefault();
                run("underline");
              }
              if (k === "k") {
                e.preventDefault();
                run("link");
              }
            }
          }}
          onPaste={(e) => {
            if (disabled) return;
            e.preventDefault();
            const html = e.clipboardData.getData("text/html");
            const text = e.clipboardData.getData("text/plain");
            if (html && html.trim()) {
              insertHtml(sanitizeRichHtml(html));
            } else if (text) {
              // eslint-disable-next-line @typescript-eslint/no-deprecated
              document.execCommand("insertText", false, text);
            }
            emit();
          }}
        />
      </div>
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      title={label}
      onMouseDown={(e) => {
        // Keep selection in the editor.
        e.preventDefault();
      }}
      onClick={onClick}
      className="inline-flex h-8 items-center justify-center rounded-lg border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
    >
      {children}
    </button>
  );
}

