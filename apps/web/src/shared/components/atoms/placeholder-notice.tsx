import { ImageOff, type LucideIcon } from "lucide-react";

/** Dashed-border "not built yet" notice, reused by every onboarding screen
 *  that isn't implemented in this phase (muscle pickers, Gym & Equipment). */
export function PlaceholderNotice({
  icon: Icon = ImageOff,
  message,
}: {
  icon?: LucideIcon;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-20 text-center">
      <Icon size={28} className="text-muted-foreground/60" aria-hidden />
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
    </div>
  );
}
