import { availableActions, actionToStatus } from '../stateMachine';

describe('availableActions', () => {
  it('lets a companion accept or decline a request', () => {
    expect(availableActions('requested', 'companion')).toEqual(['accept', 'decline']);
  });

  it('never lets a member cancel; only the trainer can', () => {
    for (const status of ['requested', 'pending_payment', 'payment_processing', 'payment_failed', 'accepted'] as const) {
      expect(availableActions(status, 'seeker')).not.toContain('cancel');
    }
    expect(availableActions('requested', 'seeker')).toEqual([]);
  });

  it('lets the trainer cancel while the booking waits for payment', () => {
    expect(availableActions('pending_payment', 'companion')).toEqual(['cancel']);
    expect(availableActions('payment_processing', 'companion')).toEqual(['cancel']);
    expect(availableActions('payment_failed', 'companion')).toEqual(['cancel']);
    expect(availableActions('payment_processing', 'seeker')).toEqual([]);
  });

  it('lets either party complete an accepted booking, but only the trainer cancel it', () => {
    expect(availableActions('accepted', 'seeker')).toEqual(['complete']);
    expect(availableActions('accepted', 'companion')).toEqual(['complete', 'cancel']);
  });

  it('offers no actions on terminal states', () => {
    expect(availableActions('completed', 'seeker')).toEqual([]);
    expect(availableActions('declined', 'companion')).toEqual([]);
  });
});

describe('actionToStatus', () => {
  it('maps actions to their resulting status', () => {
    expect(actionToStatus('accept')).toBe('pending_payment');
    expect(actionToStatus('decline')).toBe('declined');
    expect(actionToStatus('cancel')).toBe('cancelled');
    expect(actionToStatus('complete')).toBe('completed');
  });
});
