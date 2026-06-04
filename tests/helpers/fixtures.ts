/** Password that satisfies isValidPassword rules */
export const VALID_PASSWORD = 'TestPass123!';

export const INVALID_PASSWORDS = {
  tooShort: 'Ab1!',
  noUpper: 'testpass123!',
  noLower: 'TESTPASS123!',
  noNumber: 'TestPassword!',
} as const;

export const INVALID_EMAILS = ['', 'not-an-email', 'missing@domain', '@nodomain.com'] as const;

export function sampleMovie(overrides: Record<string, unknown> = {}) {
  return {
    id: '27205',
    title: 'Inception',
    originalTitle: 'Inception',
    overview: 'A thief who steals corporate secrets through dream-sharing technology.',
    releaseDate: '2010-07-16',
    genres: ['Action', 'Science Fiction', 'Adventure'],
    actors: ['Leonardo DiCaprio'],
    director: 'Christopher Nolan',
    rating: 8.4,
    voteCount: 30000,
    popularity: 50,
    posterUrl: 'https://image.tmdb.org/t/p/w500/test.jpg',
    language: 'en',
    adult: false,
    ...overrides,
  };
}
