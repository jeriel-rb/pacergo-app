"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  /** The action. May be async; thrown errors are shown and keep the dialog open. */
  onConfirm: () => void | Promise<void>;
  /** Red confirm button for irreversible actions. */
  destructive?: boolean;
  /** When set, the confirm button stays disabled until the user types this exactly. */
  confirmKeyword?: string;
  /** Placeholder for the type-to-confirm input. */
  confirmKeywordPlaceholder?: string;
  /** Extra content rendered between the description and the footer. */
  children?: React.ReactNode;
}

/**
 * Declarative confirmation modal built on the shared Dialog. Handles the loading
 * spinner, inline error, and an optional type-to-confirm gate so callers only
 * supply copy + an `onConfirm`. Reuse for any confirm/destructive action.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  destructive = false,
  confirmKeyword,
  confirmKeywordPlaceholder,
  children,
}: ConfirmDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [typed, setTyped] = React.useState("");

  const gated = Boolean(confirmKeyword);
  const keywordOk = !gated || typed.trim() === confirmKeyword;

  function handleOpenChange(next: boolean) {
    if (loading) return; // don't dismiss mid-action
    if (!next) {
      setError(null);
      setTyped("");
    }
    onOpenChange(next);
  }

  async function handleConfirm() {
    setError(null);
    setLoading(true);
    try {
      await onConfirm();
      setLoading(false);
      setTyped("");
      onOpenChange(false);
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {children}

        {gated && (
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={confirmKeywordPlaceholder}
            aria-label={confirmKeywordPlaceholder ?? confirmKeyword}
            autoComplete="off"
          />
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={loading}>
              {cancelLabel}
            </Button>
          </DialogClose>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={loading || !keywordOk}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
