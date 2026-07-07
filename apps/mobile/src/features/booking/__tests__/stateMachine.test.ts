import { availableActions, actionToStatus } from '../stateMachine';

describe('availableActions', () => {
  it('lets a companion accept or decline a request', () => {
    expect(availableActions('requested', 'companion')).toEqual(['accept', 'decline']);
  });

  it('lets a seeker cancel their own pending request', () => {
    expect(availableActions('requested', 'seeker')).toEqual(['cancel']);
  });

  it('lets either party cancel or complete an accepted booking', () => {
    expect(availableActions('accepted', 'seeker')).toEqual(['complete', 'cancel']);
    expect(availableActions('accepted', 'companion')).toEqual(['complete', 'cancel']);
  });

  it('offers no actions on terminal states', () => {
    expect(availableActions('completed', 'seeker')).toEqual([]);
    expect(availableActions('declined', 'companion')).toEqual([]);
  });
});

describe('actionToStatus', () => {
  it('maps actions to their resulting status', () => {
    expect(actionToStatus('accept')).toBe('accepted');
    expect(actionToStatus('decline')).toBe('declined');
    expect(actionToStatus('cancel')).toBe('cancelled');
    expect(actionToStatus('complete')).toBe('completed');
  });
});
