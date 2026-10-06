import {
  Dumbbell,
  PersonStanding,
  Footprints,
  Mountain,
  Timer,
  Bike,
  Flower2,
  Waves,
  Shield,
  Circle,
  type LucideIcon,
} from "lucide-react";

/** Maps the lucide icon names in `@pacergo/shared` ACTIVITY_META to components. */
export const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  dumbbell: Dumbbell,
  "person-standing": PersonStanding,
  footprints: Footprints,
  mountain: Mountain,
  timer: Timer,
  bike: Bike,
  flower: Flower2,
  waves: Waves,
  shield: Shield,
  circle: Circle,
};
