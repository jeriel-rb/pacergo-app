// Typings for the Expo public env vars used in the app.
// (We intentionally avoid pulling in all of @types/node.)
declare const process: {
  env: {
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
    [key: string]: string | undefined;
  };
};
