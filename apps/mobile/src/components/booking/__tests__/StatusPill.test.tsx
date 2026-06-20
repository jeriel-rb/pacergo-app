import { render } from '@testing-library/react-native';
import { StatusPill } from '../StatusPill';

describe('StatusPill', () => {
  it('renders the localized status label', () => {
    const { getByText } = render(<StatusPill status="accepted" />);
    expect(getByText('Accepted')).toBeTruthy();
  });
});
