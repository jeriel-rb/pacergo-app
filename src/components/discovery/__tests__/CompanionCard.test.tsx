import { fireEvent, render } from '@testing-library/react-native';
import { CompanionCard } from '../CompanionCard';

const companion = {
  companion_id: 'c1',
  display_name: 'Coach Lee',
  photo_url: null,
  experience_level: 'advanced' as const,
  home_area: 'Da’an',
  tier: 'A' as const,
  activity_slug: 'gym',
  price_ntd: 1200,
  is_free: false,
  distance_m: 800,
};

describe('CompanionCard', () => {
  it('shows name, tier, price and distance, and fires onPress', () => {
    const onPress = jest.fn();
    const { getByText } = render(<CompanionCard companion={companion} onPress={onPress} />);
    expect(getByText('Coach Lee')).toBeTruthy();
    expect(getByText('A')).toBeTruthy();
    expect(getByText(/1,200/)).toBeTruthy();
    expect(getByText(/800 m/)).toBeTruthy();
    fireEvent.press(getByText('Coach Lee'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
