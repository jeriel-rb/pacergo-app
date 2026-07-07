import { View, ScrollView, Alert, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { TierBadge } from '@/components/ui/TierBadge';
import { PriceTag } from '@/components/ui/PriceTag';
import { useCompanion } from '@/features/discovery/useCompanion';
import { useSavedIds, useToggleSaved } from '@/features/discovery/useSaved';
import { useBlock } from '@/features/safety/useBlocks';

export default function CompanionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { data } = useCompanion(id);
  const saved = useSavedIds();
  const toggle = useToggleSaved();
  const block = useBlock();

  const detail = data?.detail;
  const isSaved = (saved.data ?? []).includes(id);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingTop: 16, gap: 16 }}>
        {detail?.banner_url ? (
          <Image
            source={{ uri: detail.banner_url }}
            className="h-36 w-full rounded-lg"
            resizeMode="cover"
          />
        ) : null}
        <View className={`items-center gap-2 ${detail?.banner_url ? '-mt-14' : ''}`}>
          <Avatar name={detail?.display_name ?? ''} photoUrl={detail?.photo_url} size={88} />
          <AppText variant="h1">{detail?.display_name ?? ''}</AppText>
          {detail?.home_area ? <AppText variant="caption">{detail.home_area}</AppText> : null}
          <AppText variant="caption">
            {t('companion.reviews', { count: detail?.rating_count ?? 0 })}
          </AppText>
        </View>

        {detail?.bio ? <AppText variant="body">{detail.bio}</AppText> : null}

        <AppText variant="h3">{t('companion.offerings')}</AppText>
        {(data?.offerings ?? []).map((o) => (
          <View
            key={o.id}
            className="flex-row items-center justify-between rounded-lg bg-dark-surface p-4"
          >
            <View className="flex-row items-center gap-2">
              <TierBadge tier={o.tier} />
              <AppText variant="body">{o.session_minutes} min</AppText>
            </View>
            <PriceTag amount={o.is_free ? 0 : o.price_ntd} />
          </View>
        ))}

        <View className="gap-3 pt-2">
          <Button
            label={isSaved ? t('companion.saved') : t('companion.save')}
            variant="secondary"
            onPress={() => toggle.mutate(id)}
          />
          <Button
            label={t('companion.request')}
            onPress={() => router.push(`/booking/request/${id}`)}
          />
          <Button
            label={t('safety.report')}
            variant="ghost"
            onPress={() => router.push(`/report/${id}`)}
          />
          <Button
            label={t('safety.block')}
            variant="ghost"
            onPress={() =>
              Alert.alert('Pacergo', t('safety.blockConfirm'), [
                { text: t('bookingDetail.cancel'), style: 'cancel' },
                {
                  text: t('safety.block'),
                  style: 'destructive',
                  onPress: () => {
                    block.mutate(id);
                    router.back();
                  },
                },
              ])
            }
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
