import { FlatList, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { useConversations } from '@/features/chat/useConversations';

export default function ChatInboxScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data } = useConversations();

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <View className="px-6 pt-2">
        <AppText variant="h1" className="mb-3">
          {t('chatScreen.title')}
        </AppText>
      </View>
      <FlatList
        contentContainerStyle={{ paddingHorizontal: 24 }}
        data={data ?? []}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/chat/${item.id}`)}
            className="mb-3 flex-row items-center gap-3 rounded-lg bg-dark-surface p-4"
          >
            <Avatar name={item.other_name ?? ''} photoUrl={item.other_photo} size={48} />
            <View className="flex-1 gap-0.5">
              <AppText variant="h3">{item.other_name ?? ''}</AppText>
              {item.last_body ? (
                <AppText variant="caption" numberOfLines={1}>
                  {item.last_body}
                </AppText>
              ) : null}
            </View>
            {item.unread > 0 ? (
              <View className="h-6 min-w-6 items-center justify-center rounded-full bg-brand-deep px-1.5">
                <AppText variant="caption" className="text-white">
                  {item.unread}
                </AppText>
              </View>
            ) : null}
          </Pressable>
        )}
        ListEmptyComponent={
          <AppText variant="caption" className="mt-10 text-center">
            {t('chatScreen.empty')}
          </AppText>
        }
      />
    </SafeAreaView>
  );
}
