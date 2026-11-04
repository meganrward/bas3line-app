import { DailyMetric, InstagramPost } from '../../lib/types';
import {
  buildInstagramKpis,
  calculateFollowerGrowth,
  formatFollowerGrowth,
  formatNullable,
  formatRankingCategory,
} from './AmbassadorDetail.utils';

const now = new Date('2026-07-01T12:00:00Z');

function makePost(overrides: Partial<InstagramPost>): InstagramPost {
  return {
    id: 'post',
    ambassador_id: 'ambassador',
    media_type: null,
    timestamp: '2026-06-25T12:00:00Z',
    likes: null,
    comments: null,
    saves: null,
    shares: null,
    reach: null,
    impressions: null,
    engagement_rate: null,
    permalink: null,
    created_at: '2026-06-25T12:00:00Z',
    ...overrides,
  };
}

function makeMetrics(counts: (number | null)[]): DailyMetric[] {
  return counts.map((followerCount, index) => ({
    id: String(index),
    ambassador_id: 'ambassador',
    date: '2026-06-01',
    follower_count: followerCount,
    created_at: '2026-06-01T00:00:00Z',
  }));
}

describe('formatRankingCategory', () => {
  it('capitalises a category', () => {
    expect(formatRankingCategory('female')).toBe('Female');
  });

  it('falls back to Open when there is no category', () => {
    expect(formatRankingCategory(null)).toBe('Open');
    expect(formatRankingCategory('')).toBe('Open');
  });
});

describe('formatNullable', () => {
  it('formats present values, including zero', () => {
    expect(formatNullable(0, (value) => `#${value}`)).toBe('#0');
  });

  it('returns a dash for null', () => {
    expect(formatNullable(null, String)).toBe('—');
  });
});

describe('formatFollowerGrowth', () => {
  it('prefixes positive and zero growth with a plus', () => {
    expect(formatFollowerGrowth(12)).toBe('+12');
    expect(formatFollowerGrowth(0)).toBe('+0');
  });

  it('leaves negative growth with its minus sign', () => {
    expect(formatFollowerGrowth(-4)).toBe('-4');
  });

  it('returns a dash when growth is unknown', () => {
    expect(formatFollowerGrowth(null)).toBe('—');
  });
});

describe('calculateFollowerGrowth', () => {
  it('compares the newest day with the 30th day', () => {
    const counts = [150, ...Array(28).fill(120), 100];
    expect(calculateFollowerGrowth(makeMetrics(counts))).toBe(50);
  });

  it('returns null when there is less than 30 days of data', () => {
    expect(calculateFollowerGrowth(makeMetrics([150, 140]))).toBeNull();
  });

  it('returns null when either end has no follower count', () => {
    const counts = [null, ...Array(28).fill(120), 100];
    expect(calculateFollowerGrowth(makeMetrics(counts))).toBeNull();
  });
});

describe('buildInstagramKpis', () => {
  it('averages only posts from the last 30 days', () => {
    const posts = [
      makePost({ id: 'a', engagement_rate: 4, reach: 100 }),
      makePost({ id: 'b', engagement_rate: 2, reach: 300 }),
      makePost({ id: 'old', timestamp: '2026-05-01T12:00:00Z', engagement_rate: 50, reach: 9999 }),
    ];

    expect(buildInstagramKpis(posts, [], now)).toEqual({
      postCount: 2,
      averageEngagement: 3,
      averageReach: 200,
      followerGrowth: null,
    });
  });

  it('ignores posts without a timestamp and returns null averages when none are recent', () => {
    const kpis = buildInstagramKpis([makePost({ timestamp: null })], [], now);

    expect(kpis.postCount).toBe(0);
    expect(kpis.averageEngagement).toBeNull();
    expect(kpis.averageReach).toBeNull();
  });
});
