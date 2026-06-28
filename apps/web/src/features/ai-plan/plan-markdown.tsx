"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renders authored training-plan markdown with the app's typography. Kept
 *  here so every plan surface (page, future saved view) styles identically. */
export function PlanMarkdown({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-xl font-bold leading-tight">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="mt-6 border-t border-border pt-5 text-base font-bold text-foreground">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-4 text-sm font-semibold">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="mt-2 text-sm leading-relaxed text-foreground/80">
            {children}
          </p>
        ),
        ul: ({ children }) => (
          <ul className="mt-2 space-y-1.5 text-sm text-foreground/80">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-foreground/80">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="flex gap-2 [ol_&]:list-item [ol_&]:pl-0">
            <span className="mt-2 hidden h-1.5 w-1.5 shrink-0 rounded-full bg-primary [ul_&]:block" />
            <span className="min-w-0 flex-1">{children}</span>
          </li>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        blockquote: ({ children }) => (
          <blockquote className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground/80">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="border-b border-border text-left">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 text-xs font-semibold text-muted-foreground">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border-b border-border/60 px-3 py-2 align-top text-foreground/80">
            {children}
          </td>
        ),
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}
