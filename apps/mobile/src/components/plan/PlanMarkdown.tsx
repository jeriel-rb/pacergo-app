import { View, Text } from 'react-native';
import { AppText } from '@/components/ui/AppText';

/** Inline `**bold**` support on top of the app text styles. */
function Inline({ text, className }: { text: string; className?: string }) {
  const parts = text.split('**');
  return (
    <AppText variant="body" className={className}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <Text key={i} className="font-sans-semibold text-dark-text">
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </AppText>
  );
}

/**
 * Minimal renderer for the composed training-menu markdown (the subset the
 * composer emits: #/## headings, > quotes, - bullets, 2-column tables, bold).
 */
export function PlanMarkdown({ markdown }: { markdown: string }) {
  const lines = markdown.split('\n');
  const out: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    if (line.startsWith('# ')) {
      out.push(
        <AppText key={i} variant="h2" className="mt-1">
          {line.slice(2)}
        </AppText>,
      );
    } else if (line.startsWith('## ')) {
      out.push(
        <AppText key={i} variant="h3" className="mt-3">
          {line.slice(3)}
        </AppText>,
      );
    } else if (line.startsWith('> ')) {
      out.push(
        <View key={i} className="rounded-md border-l-2 border-brand bg-dark-surface px-3 py-2">
          <Inline text={line.slice(2)} className="text-[14px] leading-[20px]" />
        </View>,
      );
    } else if (line.startsWith('- ')) {
      out.push(
        <View key={i} className="flex-row gap-2 pl-1">
          <AppText variant="body">•</AppText>
          <View className="flex-1">
            <Inline text={line.slice(2)} />
          </View>
        </View>,
      );
    } else if (/^\|\s*-/.test(line)) {
      // table separator row — skip
    } else if (line.startsWith('|')) {
      const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
      out.push(
        <View
          key={i}
          className="flex-row items-start justify-between gap-3 border-b border-white/5 py-1.5"
        >
          <AppText variant="body" className="font-sans-semibold">
            {cells[0]}
          </AppText>
          <View className="flex-1 items-end">
            <Inline text={cells.slice(1).join(' · ')} className="text-right" />
          </View>
        </View>,
      );
    } else if (line.trim() !== '') {
      out.push(<Inline key={i} text={line} />);
    }
  });

  return <View className="gap-2">{out}</View>;
}
