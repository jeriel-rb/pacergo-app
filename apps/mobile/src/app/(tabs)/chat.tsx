import { FlatList, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { useConversations } from '@/features/chat/useConversations';
import { counterpartOf } from '@/features/chat/counterpartOf';
import { useSession } from '@/features/auth/useSession';

export default function ChatInboxScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useSession();
  const uid = session?.user.id ?? '';
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
        renderItem={({ item }) => {
          const other = counterpartOf(item, uid);
          return (
            <Pressable
              onPress={() => router.push(`/chat/${item.id}`)}
              className="mb-3 flex-row items-center gap-3 rounded-lg bg-dark-surface p-4"
            >
              <Avatar name={other.name ?? ''} photoUrl={other.photo} size={48} />
              <AppText variant="h3">{other.name ?? ''}</AppText>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <AppText variant="caption" className="mt-10 text-center">
            {t('chatScreen.empty')}
          </AppText>
        }
      />
    </SafeAreaView>
  );
}
