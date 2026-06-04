import { beforeAll } from 'vitest';

beforeAll(() => {
  process.env.MOVIE_API_BASE_URL ??=
    'https://movie-recommendation-system.baktash-ansari1381.workers.dev';
  process.env.MOVIE_SITE_URL ??= 'https://movie.baktashans.com';
});
