import { MentionsService } from './mentions.service';

describe('MentionsService.extractUsernames', () => {
  it('extracts distinct usernames, lowercased', () => {
    const result = MentionsService.extractUsernames('hey @Alice and @bob and @Alice again');
    expect(result).toEqual(['alice', 'bob']);
  });

  it('ignores short tokens and returns empty for no mentions', () => {
    expect(MentionsService.extractUsernames('no mentions here')).toEqual([]);
    expect(MentionsService.extractUsernames('@ab too short')).toEqual([]);
  });

  it('handles null/undefined content', () => {
    expect(MentionsService.extractUsernames(null)).toEqual([]);
    expect(MentionsService.extractUsernames(undefined)).toEqual([]);
  });

  it('supports dots and underscores in usernames', () => {
    expect(MentionsService.extractUsernames('ping @jane_doe.99')).toEqual(['jane_doe.99']);
  });
});
