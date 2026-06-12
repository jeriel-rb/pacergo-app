import { useState } from 'react';
import { View, TextInput, FlatList, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { useMessages } from '@/features/chat/useMessages';
import { useSendMessage } from '@/features/chat/useSendMessage';
import { useSession } from '@/features/auth/useSession';

export default function ChatThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { session } = useSession();
  const uid = session?.user.id;
  const { data: messages } = useMessages(id);
  const send = useSendMessage(id);
  const [text, setText] = useState('');

  function onSend() {
    if (!text.trim()) return;
    send.mutate(text);
    setText('');
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <FlatList
          contentContainerStyle={{ padding: 16, gap: 8 }}
          data={messages ?? []}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => {
            const mine = item.sender_id === uid;
            return (
              <View
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  mine ? 'self-end bg-brand-deep' : 'self-start bg-dark-surface'
                }`}
              >
                <AppText variant="body" className={mine ? 'text-white' : 'text-dark-text'}>
                  {item.body}
                </AppText>
              </View>
            );
          }}
        />
        <View className="flex-row items-center gap-2 border-t border-white/10 px-4 py-2">
          <TextInput
            placeholder={t('chatScreen.placeholder')}
            placeholderTextColor="#6B6B74"
            value={text}
            onChangeText={setText}
            className="flex-1 rounded-full bg-dark-surface px-4 py-3 text-dark-text"
          />
          <Pressable onPress={onSend} className="rounded-full bg-brand-deep px-5 py-3">
            <AppText className="text-white">{t('chatScreen.send')}</AppText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
