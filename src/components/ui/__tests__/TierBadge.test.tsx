import { render } from '@testing-library/react-native';
import { TierBadge } from '../TierBadge';

describe('TierBadge', () => {
  it('renders the tier letter', () => {
    const { getByText } = render(<TierBadge tier="A" />);
    expect(getByText('A')).toBeTruthy();
  });

  it('exposes an accessibility label naming the tier', () => {
    const { getByLabelText } = render(<TierBadge tier="C" />);
    expect(getByLabelText('Tier C')).toBeTruthy();
  });
});
