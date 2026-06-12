import { Text, type TextProps } from 'react-native';

type Variant = 'display' | 'h1' | 'h2' | 'body' | 'caption';

const variantClass: Record<Variant, string> = {
  display: 'font-display text-[32px] leading-[40px] text-dark-text',
  h1: 'font-display text-[28px] leading-[34px] text-dark-text',
  h2: 'font-sans-semibold text-[22px] leading-[28px] text-dark-text',
  body: 'font-sans text-[16px] leading-[22px] text-dark-text',
  caption: 'font-sans text-[13px] leading-[18px] text-dark-text-secondary',
};

export function AppText({
  variant = 'body',
  className,
  ...props
}: TextProps & { variant?: Variant; className?: string }) {
  return <Text className={`${variantClass[variant]} ${className ?? ''}`} {...props} />;
}
