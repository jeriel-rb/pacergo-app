import { fireEvent, render } from '@testing-library/react-native';
import { SegmentedControl } from '../SegmentedControl';

describe('SegmentedControl', () => {
  it('renders options and reports the selected change', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <SegmentedControl
        value="dark"
        onChange={onChange}
        options={[
          { value: 'dark', label: 'Dark' },
          { value: 'light', label: 'Light' },
        ]}
      />
    );
    fireEvent.press(getByText('Light'));
    expect(onChange).toHaveBeenCalledWith('light');
  });
});
