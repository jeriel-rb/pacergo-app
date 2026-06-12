import { fireEvent, render } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button', () => {
  it('renders its label', () => {
    const { getByText } = render(<Button label="Request" onPress={() => {}} />);
    expect(getByText('Request')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button label="Request" onPress={onPress} />);
    fireEvent.press(getByText('Request'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button label="Request" onPress={onPress} disabled />
    );
    fireEvent.press(getByText('Request'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
