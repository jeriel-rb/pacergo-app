import { render } from '@testing-library/react-native';
import { Avatar } from '../Avatar';

describe('Avatar', () => {
  it('shows an initial when no photo is provided', () => {
    const { getByText } = render(<Avatar name="Lee" />);
    expect(getByText('L')).toBeTruthy();
  });

  it('falls back to ? for an empty name', () => {
    const { getByText } = render(<Avatar name="" />);
    expect(getByText('?')).toBeTruthy();
  });
});
