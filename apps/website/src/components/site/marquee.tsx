const ACTIVITIES = [
  "Gym",
  "Running",
  "Climbing",
  "Yoga",
  "Boxing",
  "Hiking",
  "Swimming",
  "Cycling",
  "Pilates",
  "Tennis",
  "Basketball",
  "CrossFit",
];

export function Marquee() {
  // Render the list twice so the -50% translate loops seamlessly.
  const track = [...ACTIVITIES, ...ACTIVITIES];

  return (
    <section
      aria-label="Supported activities"
      className="border-y border-ink/10 bg-ink py-5 text-paper"
    >
      <div className="relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="animate-marquee flex shrink-0 items-center gap-10 pr-10">
          {track.map((activity, i) => (
            <span key={i} className="flex items-center gap-10">
              <span className="font-display text-xl font-medium tracking-tight text-paper/85">
                {activity}
              </span>
              <span className="size-1.5 rounded-full bg-brand" aria-hidden />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
