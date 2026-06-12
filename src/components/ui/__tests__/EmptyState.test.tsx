import { render } from '@testing-library/react-native';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders the message', () => {
    const { getByText } = render(<EmptyState message="Nothing here" />);
    expect(getByText('Nothing here')).toBeTruthy();
  });
});
