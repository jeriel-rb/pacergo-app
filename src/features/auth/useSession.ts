import { createContext, useContext } from 'react';
import type { Session } from '@supabase/supabase-js';

export type SessionContextValue = {
  session: Session | null;
  loading: boolean;
};

export const SessionContext = createContext<SessionContextValue>({
  session: null,
  loading: true,
});

export function useSession(): SessionContextValue {
  return useContext(SessionContext);
}
