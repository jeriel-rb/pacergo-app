import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/shared/components/ui/button";

export interface SaveButtonProps extends Omit<ButtonProps, "children"> {
  /** Whether any field differs from the saved values (see `useFormDirty`). */
  dirty: boolean;
  /** A save is in flight: shows a spinner and blocks double submits. */
  saving?: boolean;
  label: React.ReactNode;
  /** Shown instead of `label` while saving. */
  savingLabel?: React.ReactNode;
}

/**
 * The one Save / Apply / Update button for every form. Disabled until something
 * has changed (`dirty`), while saving, or when the caller says the form is invalid
 * (`disabled`). Pass `type="submit"` inside a `<form>`; otherwise it is a plain button.
 */
export function SaveButton({
  dirty,
  saving = false,
  label,
  savingLabel,
  disabled,
  type = "button",
  ...props
}: SaveButtonProps) {
  return (
    <Button type={type} disabled={saving || !dirty || disabled} {...props}>
      {saving && <Loader2 size={16} className="animate-spin" />}
      {saving && savingLabel ? savingLabel : label}
    </Button>
  );
}
