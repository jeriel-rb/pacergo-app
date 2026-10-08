import { FlatList, View, Pressable, Alert, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useProfile } from '@/features/profile/useProfile';
import {
  usePendingVerifications,
  useReviewVerification,
  getVerificationDocUrl,
  type PendingVerification,
} from '@/features/admin/useAdmin';

/** Admin review queue for certification / competition submissions. */
export default function AdminScreen() {
  const { t } = useTranslation();
  const { data: profile } = useProfile();
  const { data } = usePendingVerifications();
  const review = useReviewVerification();

  if (profile && !profile.is_admin) {
    return (
      <ScreenContainer>
        <AppText variant="body" className="pt-10">
          {t('admin.forbidden')}
        </AppText>
      </ScreenContainer>
    );
  }

  async function openDoc(item: PendingVerification) {
    const url = await getVerificationDocUrl(item.document_path);
    if (url) await Linking.openURL(url);
  }

  function decide(item: PendingVerification, status: 'approved' | 'rejected') {
    Alert.alert('PacerGo', t(`admin.${status}Confirm`), [
      { text: t('bookingDetail.cancel'), style: 'cancel' },
      {
        text: t(`admin.${status}`),
        style: status === 'rejected' ? 'destructive' : 'default',
        onPress: () => review.mutate({ id: item.id, status }),
      },
    ]);
  }

  return (
    <ScreenContainer>
      <AppText variant="h1" className="py-4">
        {t('admin.title')}
      </AppText>
      <FlatList
        data={data ?? []}
        keyExtractor={(v) => v.id}
        renderItem={({ item }) => (
          <View className="mb-3 gap-3 rounded-lg bg-dark-surface p-4">
            <View className="flex-row items-center gap-3">
              <Avatar name={item.display_name ?? ''} photoUrl={item.photo_url} size={40} />
              <View className="flex-1">
                <AppText variant="h3">{item.display_name ?? ''}</AppText>
                <AppText variant="caption">
                  {t(`admin.doc.${item.doc_type}`)}
                  {item.activity ? ` · ${item.activity}` : ''}
                  {item.label ? ` · ${item.label}` : ''}
                </AppText>
              </View>
              <AppText variant="caption">{t(`verification.${item.status}`)}</AppText>
            </View>
            <Pressable onPress={() => openDoc(item)}>
              <AppText variant="caption" className="text-brand">
                {t('admin.viewDoc')}
              </AppText>
            </Pressable>
            {item.status === 'pending' ? (
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Button
                    label={t('admin.approved')}
                    onPress={() => decide(item, 'approved')}
                    disabled={review.isPending}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    label={t('admin.rejected')}
                    variant="destructive"
                    onPress={() => decide(item, 'rejected')}
                    disabled={review.isPending}
                  />
                </View>
              </View>
            ) : null}
          </View>
        )}
        ListEmptyComponent={<AppText variant="caption">{t('admin.empty')}</AppText>}
      />
    </ScreenContainer>
  );
}
