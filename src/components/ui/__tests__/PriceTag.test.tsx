import { render } from '@testing-library/react-native';
import { PriceTag } from '../PriceTag';

describe('PriceTag', () => {
  it('formats a paid amount as NTD', () => {
    const { getByText } = render(<PriceTag amount={1200} />);
    expect(getByText(/1,200/)).toBeTruthy();
  });

  it('shows Free for a zero amount', () => {
    const { getByText } = render(<PriceTag amount={0} />);
    expect(getByText('Free')).toBeTruthy();
  });
});
