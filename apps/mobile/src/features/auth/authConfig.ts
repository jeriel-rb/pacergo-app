import { Platform } from 'react-native';

// EXPO_PUBLIC_* vars are inlined by babel-preset-expo at build time.
export const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
export const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

export function isGoogleConfigured(
  clientId: string | undefined = googleWebClientId
): boolean {
  return Boolean(clientId);
}

// Apple Sign In is only available on iOS devices.
export function isAppleConfigured(platform: string = Platform.OS): boolean {
  return platform === 'ios';
}
