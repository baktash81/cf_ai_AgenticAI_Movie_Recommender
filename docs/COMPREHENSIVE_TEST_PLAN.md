# MovieMind — Comprehensive Test Plan

**Product:** MovieMind (AI-Powered Movie Recommendation System)  
**Live URL:** https://movie.baktashans.com  
**Repository:** https://github.com/baktash81/AgenticAI_Movie_Recommender  
**Backend:** Cloudflare Worker `movie-recommendation-system.baktash-ansari1381.workers.dev`  
**Maintainer:** baktash (baktash.ansari1381@gmail.com)

Use this document as the single source of truth for manual QA, release checks, and automated smoke tests. Mark each item `[x]` when passed, `[ ]` when pending, `[!]` when failed (add notes in **Notes** column).

**Legend**

| Priority | Meaning |
|----------|---------|
| P0 | Blocker — must pass before any release |
| P1 | Critical user-facing feature |
| P2 | Important but not release-blocking |
| P3 | Nice-to-have / polish |

---

## 0. Test Environment Setup

| ID | Priority | Test | Steps | Expected | Status | Notes |
|----|----------|------|-------|----------|--------|-------|
| MM-ENV-001 | P0 | Production URL reachable | Open https://movie.baktashans.com | Page loads, no certificate errors | [ ] | |
| MM-ENV-002 | P0 | API base URL | Confirm frontend uses `/api` (see `frontend/src/services/api.ts`) | Requests proxied to Worker | [ ] | |
| MM-ENV-003 | P1 | Test user account | Create dedicated QA account or use disposable email | Account can register, login, logout | [ ] | |
| MM-ENV-004 | P2 | Browser matrix | Test Chrome, Firefox, Safari (or WebKit) | No layout-breaking issues | [ ] | |
| MM-ENV-005 | P2 | Mobile viewport | Resize to 375px width | Responsive nav and cards usable | [ ] | |
| MM-ENV-006 | P2 | Dark mode | Toggle OS/browser dark mode | Theme readable, contrast OK | [ ] | |

**Automated smoke (optional):**

```bash
BASE=https://movie.baktashans.com/api
curl -sf "$BASE/trending?limit=1" | jq '.movies | length'
curl -sf "$BASE/discovery" | jq '.sections | length'
curl -sf -o /dev/null -w "%{http_code}" https://movie.baktashans.com/  # expect 200
```

---

## 1. Infrastructure & Deployment

| ID | Priority | Test | Steps | Expected | Status | Notes |
|----|----------|------|-------|----------|--------|-------|
| MM-INF-001 | P0 | Nginx config valid | `sudo nginx -t` on server | `syntax is ok` | [ ] | |
| MM-INF-002 | P0 | SSL certificate | Check expiry for `movie.baktashans.com` | Valid, not expiring within 14 days | [ ] | |
| MM-INF-003 | P0 | HTTP → HTTPS redirect | `curl -I http://movie.baktashans.com` | 301 to HTTPS | [ ] | |
| MM-INF-004 | P0 | Static assets served | Load `/assets/index-*.js` and `.css` from deployed `index.html` | HTTP 200, correct MIME | [ ] | |
| MM-INF-005 | P0 | SPA fallback | Request `/chat`, `/discover`, `/nonexistent-route` | 200 + `index.html` (client routing) | [ ] | |
| MM-INF-006 | P0 | API proxy | `curl https://movie.baktashans.com/api/trending?limit=1` | JSON movies, HTTP 200 | [ ] | |
| MM-INF-007 | P1 | Security headers | Inspect response headers on HTTPS | `X-Frame-Options`, `X-Content-Type-Options`, etc. | [ ] | |
| MM-INF-008 | P1 | Gzip enabled | Check `Content-Encoding` on large JS | gzip or br where applicable | [ ] | |
| MM-INF-009 | P1 | Frontend build | `cd frontend && npm run build` | Exit 0, no TypeScript errors | [ ] | |
| MM-INF-010 | P1 | Worker deploy | `npx wrangler deployments list` | Recent deployment visible | [ ] | |
| MM-INF-011 | P2 | D1 migrations | `npx wrangler d1 migrations apply movie_data --remote` (deploy pipeline) | Migrations apply without error | [ ] | |
| MM-INF-012 | P2 | GitHub Actions deploy | Push to `main` or `workflow_dispatch` | Backend + frontend deploy succeed | [ ] | |
| MM-INF-013 | P2 | Deployed vs repo drift | Compare `/var/www/movie.baktashans.com` hashes to `frontend/dist` after build | Match after intentional deploy | [ ] | |

---

## 2. Authentication & Session

| ID | Priority | Test | Steps | Expected | Status | Notes |
|----|----------|------|-------|----------|--------|-------|
| MM-AUTH-001 | P0 | Register — valid | POST `/api/auth/register` with valid email, password (8+ chars), name | 200/201, tokens returned | [ ] | |
| MM-AUTH-002 | P0 | Register — invalid email | POST with `email: "invalid"` | 400, error message | [ ] | |
| MM-AUTH-003 | P0 | Register — duplicate email | Register same email twice | Second request fails appropriately | [ ] | |
| MM-AUTH-004 | P0 | Login — valid | POST `/api/auth/login` | Tokens + user object | [ ] | |
| MM-AUTH-005 | P0 | Login — wrong password | POST with wrong password | 401, no tokens | [ ] | |
| MM-AUTH-006 | P0 | Protected route without token | GET `/api/auth/me` without `Authorization` | 401 Unauthorized | [ ] | |
| MM-AUTH-007 | P0 | Protected route with token | GET `/api/auth/me` with Bearer access token | 200, user profile | [ ] | |
| MM-AUTH-008 | P0 | Token refresh | POST `/api/auth/refresh` with valid refresh token | New access token | [ ] | |
| MM-AUTH-009 | P1 | Logout | POST `/api/auth/logout` while logged in | Success; subsequent protected calls fail | [ ] | |
| MM-AUTH-010 | P1 | UI — Login page | Visit `/login` | MovieMind branding, form works | [ ] | |
| MM-AUTH-011 | P1 | UI — Signup page | Visit `/signup` | Registration form works | [ ] | |
| MM-AUTH-012 | P1 | Redirect when authenticated | Login, then visit `/login` | Redirect to `/chat` | [ ] | |
| MM-AUTH-013 | P1 | Protected UI routes | Logout, visit `/chat` | Redirect to login | [ ] | |
| MM-AUTH-014 | P1 | Token stored in localStorage | Login via UI, inspect `auth_tokens` key | JSON with access + refresh tokens | [ ] | |
| MM-AUTH-015 | P1 | Auto refresh on 401 | Expire access token (or wait), call protected API | Silent refresh or redirect to login | [ ] | |
| MM-AUTH-016 | P2 | Update profile | PUT `/api/auth/profile` with name/avatar fields | Profile updated, reflected in UI | [ ] | |
| MM-AUTH-017 | P2 | Password edge cases | Register with short password, empty fields | Clear validation errors | [ ] | |

---

## 3. API — Public Endpoints (No Auth)

| ID | Priority | Test | Steps | Expected | Status | Notes |
|----|----------|------|-------|----------|--------|-------|
| MM-API-P-001 | P0 | Trending | GET `/api/trending?limit=5` | `movies` array, poster URLs, HTTP 200 | [ ] | |
| MM-API-P-002 | P0 | Trending time window | GET `?timeWindow=day` and `week` | Valid responses for both | [ ] | |
| MM-API-P-003 | P0 | Discovery | GET `/api/discovery` | `sections` with trending/collections data | [ ] | |
| MM-API-P-004 | P1 | Collections list | GET `/api/collections` | `collections`, `seasonal`, `saved` keys | [ ] | |
| MM-API-P-005 | P1 | Collection detail | GET `/api/collections/{collectionId}` | Collection metadata + movies when applicable | [ ] | |
| MM-API-P-006 | P1 | Similar movies | GET `/api/similar/27205` (Inception) | `similarMovies` array, HTTP 200 | [ ] | Verify relevance |
| MM-API-P-007 | P1 | Watch providers | GET `/api/watch-providers/27205?region=US` | Provider data or null | [ ] | |
| MM-API-P-008 | P2 | Person details | GET `/api/person/287` (Brad Pitt example) | Person + filmography | [ ] | |
| MM-API-P-009 | P2 | Person search | GET `/api/search/person?q=Nolan` | `results` array | [ ] | |
| MM-API-P-010 | P1 | Shared list (public) | GET `/api/shared-lists/{shareCode}` with valid code | List visible without auth | [ ] | |
| MM-API-P-011 | P2 | CORS / wrong method | OPTIONS or unsupported method on known route | Appropriate error, not 500 | [ ] | |
| MM-API-P-012 | P2 | Invalid movie ID | GET `/api/similar/invalid` | Graceful 4xx, not crash | [ ] | |

---

## 4. API — Protected Endpoints (Auth Required)

| ID | Priority | Test | Steps | Expected | Status | Notes |
|----|----------|------|-------|----------|--------|-------|
| MM-API-A-001 | P0 | Preferences — analyze | POST `/api/preferences` `{ "input": "I love sci-fi and Nolan" }` | Structured preferences returned | [ ] | |
| MM-API-A-002 | P0 | Preferences — get | GET `/api/preferences` | User preferences or 404 if none | [ ] | |
| MM-API-A-003 | P0 | Recommend — NL query | POST `/api/recommend` `{ "naturalLanguage": "horror movies from the 80s" }` | `searchId` returned | [ ] | |
| MM-API-A-004 | P0 | Recommend — status poll | GET `/api/status/{searchId}` | `pending` → `completed` | [ ] | |
| MM-API-A-005 | P0 | Recommend — results | GET `/api/recommendations/{searchId}` | Movie list when complete | [ ] | |
| MM-API-A-006 | P0 | Chat message | POST `/api/chat` `{ "message": "Recommend sci-fi like Inception" }` | AI response with intent/movies | [ ] | |
| MM-API-A-007 | P1 | Chat with conversationId | POST with existing `conversationId` | Message appended to thread | [ ] | |
| MM-API-A-008 | P1 | List conversations | GET `/api/conversations` | Array of conversations | [ ] | |
| MM-API-A-009 | P1 | Create conversation | POST `/api/conversations` `{ "title": "Test" }` | `conversationId` returned | [ ] | |
| MM-API-A-010 | P1 | Get conversation | GET `/api/conversations/{id}` | Messages in order | [ ] | |
| MM-API-A-011 | P1 | Update conversation title | PUT `/api/conversations/{id}` | Title updated | [ ] | |
| MM-API-A-012 | P1 | Delete conversation | DELETE `/api/conversations/{id}` | 200; no longer in list | [ ] | |
| MM-API-A-013 | P1 | Save movies to message | POST `/api/chat/messages/{messageId}/movies` | Movies persisted on message | [ ] | |
| MM-API-A-014 | P1 | Feedback — like | POST `/api/feedback` like + movieData | `success: true`, taste profile updated | [ ] | |
| MM-API-A-015 | P1 | Feedback — get | GET `/api/feedback/{movieId}` | Feedback or null | [ ] | |
| MM-API-A-016 | P1 | Taste profile | GET `/api/taste-profile` | Summary with genres/ratings | [ ] | |
| MM-API-A-017 | P1 | Watchlist — add | POST `/api/watchlist` with movie | `watchlistId` returned | [ ] | |
| MM-API-A-018 | P1 | Watchlist — list | GET `/api/watchlist` | Items for current user only | [ ] | |
| MM-API-A-019 | P1 | Watchlist — update | PUT `/api/watchlist/{movieId}` priority/notes | Updated fields | [ ] | |
| MM-API-A-020 | P1 | Watchlist — remove | DELETE `/api/watchlist/{movieId}` | Item removed | [ ] | |
| MM-API-A-021 | P1 | Watch history — add | POST `/api/watch-history` | `historyId` returned | [ ] | |
| MM-API-A-022 | P1 | Watch history — list | GET `/api/watch-history?limit=10` | Paginated items | [ ] | |
| MM-API-A-023 | P1 | Reviews — create | POST `/api/reviews` with rating + text | `reviewId` returned | [ ] | |
| MM-API-A-024 | P1 | Reviews — movie list | GET `/api/reviews/movie/{movieId}` | Reviews + average rating | [ ] | |
| MM-API-A-025 | P1 | Reviews — user list | GET `/api/reviews/user` | Current user's reviews | [ ] | |
| MM-API-A-026 | P2 | Review vote | POST `/api/reviews/{reviewId}/vote` | Helpful count updates | [ ] | |
| MM-API-A-027 | P1 | Shared list — create | POST `/api/shared-lists` | `shareCode`, `shareUrl` | [ ] | |
| MM-API-A-028 | P1 | My shared lists | GET `/api/my-shared-lists` | User's lists only | [ ] | |
| MM-API-A-029 | P2 | Collection save toggle | POST `/api/collections/{id}/save` | `saved` state toggles | [ ] | |
| MM-API-A-030 | P0 | Cross-user isolation | User A token cannot read User B watchlist | 403/404, no data leak | [ ] | |

---

## 5. Frontend — Pages & Navigation

| ID | Priority | Test | Steps | Expected | Status | Notes |
|----|----------|------|-------|----------|--------|-------|
| MM-UI-001 | P0 | Home `/` | Login, open Home | Home content loads | [ ] | |
| MM-UI-002 | P0 | Chat `/chat` | Open Chat | Input, send, messages render | [ ] | |
| MM-UI-003 | P0 | Discover `/discover` | Sidebar → Discover | Trending sections, movie cards | [ ] | Route is `/discover` not `/discovery` |
| MM-UI-004 | P0 | Collections `/collections` | Open Collections | Curated lists display | [ ] | |
| MM-UI-005 | P0 | Watchlist `/watchlist` | Open Watchlist | User items or empty state | [ ] | |
| MM-UI-006 | P1 | Profile `/profile` | Open Profile | Preferences form loads | [ ] | |
| MM-UI-007 | P1 | Sidebar navigation | Click each nav item | Correct route, active state | [ ] | |
| MM-UI-008 | P1 | New Chat button | Click New Chat | Fresh chat session | [ ] | |
| MM-UI-009 | P1 | Chat history sidebar | After multiple chats, list appears | Select, delete conversation works | [ ] | |
| MM-UI-010 | P1 | Navbar logout | Click logout | Tokens cleared, redirect login | [ ] | |
| MM-UI-011 | P2 | Unknown route | Visit `/foo-bar` | Redirect to `/` per App.tsx | [ ] | |
| MM-UI-012 | P2 | Loading spinner | Hard refresh while auth resolving | Spinner, then app | [ ] | |
| MM-UI-013 | P2 | Pro tip sidebar | Visible on large screens | Readable tip text | [ ] | |

---

## 6. Chat & AI Recommendations

| ID | Priority | Test | Steps | Expected | Status | Notes |
|----|----------|------|-------|----------|--------|-------|
| MM-CHAT-001 | P0 | Simple recommendation | Send: "Recommend sci-fi movies" | Assistant reply + movie cards | [ ] | |
| MM-CHAT-002 | P0 | Specific genre override | Set dislike horror in profile, ask "horror movies" | Returns horror (explicit intent wins) | [ ] | |
| MM-CHAT-003 | P1 | Vague query uses profile | Ask "recommend something" with profile set | Uses favorite genres/preferences | [ ] | |
| MM-CHAT-004 | P1 | Movie cards display | After recommendation | Poster, title, rating, overview | [ ] | |
| MM-CHAT-005 | P1 | Add to watchlist from card | Click add on MovieCard | Appears in watchlist | [ ] | |
| MM-CHAT-006 | P1 | Similar movies modal | Open similar from card | Modal with related titles | [ ] | |
| MM-CHAT-007 | P1 | Feedback on card | Like / dislike / love | Persists, affects taste profile | [ ] | |
| MM-CHAT-008 | P2 | Long conversation | 10+ messages in one thread | History loads, no truncation bugs | [ ] | |
| MM-CHAT-009 | P2 | Empty message | Submit blank | Validation prevents send | [ ] | |
| MM-CHAT-010 | P2 | Very long message | 2000+ character query | Handled without 500 | [ ] | |
| MM-CHAT-011 | P1 | Structured recommend flow | Use recommend API + poll status | Results match query in UI if wired | [ ] | |
| MM-CHAT-012 | P2 | Error state | Simulate API failure (network off) | User-friendly error, retry possible | [ ] | |

---

## 7. Discovery, Collections & TMDB Content

| ID | Priority | Test | Steps | Expected | Status | Notes |
|----|----------|------|-------|----------|--------|-------|
| MM-DISC-001 | P0 | Discovery page sections | Load `/discover` | Trending + collection sections populated | [ ] | |
| MM-DISC-002 | P1 | Trending posters | Click or hover cards | Images load from TMDB CDN | [ ] | |
| MM-DISC-003 | P1 | Collection card expand | Open a collection | Movies listed inside collection | [ ] | |
| MM-DISC-004 | P1 | Seasonal collection flag | Check `isCurrentSeason` in API/UI | Correct seasonal highlight | [ ] | |
| MM-DISC-005 | P1 | Taste profile widget | On discovery when logged in | Shows genre affinities | [ ] | |
| MM-DISC-006 | P2 | Save collection | Toggle save on collection | Appears under saved | [ ] | |
| MM-DISC-007 | P1 | Watch providers UI | Open providers for a movie | Streaming options shown | [ ] | |
| MM-DISC-008 | P2 | Broken poster fallback | Movie without poster path | Placeholder or graceful UI | [ ] | |

---

## 8. Watchlist, Reviews & Social

| ID | Priority | Test | Steps | Expected | Status | Notes |
|----|----------|------|-------|----------|--------|-------|
| MM-SOC-001 | P0 | Add to watchlist | From chat card or discovery | Item in `/watchlist` | [ ] | |
| MM-SOC-002 | P1 | Watchlist sort | Change sort if UI supports | Order updates | [ ] | |
| MM-SOC-003 | P1 | Watchlist notes/priority | Edit item | Fields persist after refresh | [ ] | |
| MM-SOC-004 | P1 | Remove from watchlist | Delete item | Gone from list | [ ] | |
| MM-SOC-005 | P1 | Write review | Submit review on movie | Visible on movie reviews | [ ] | |
| MM-SOC-006 | P2 | Vote review helpful | Vote on another review | Count increments | [ ] | |
| MM-SOC-007 | P1 | Create shared list | Build list, share | Copy link with share code | [ ] | |
| MM-SOC-008 | P1 | Open shared list (logged out) | Open share URL in incognito | Public view works | [ ] | |
| MM-SOC-009 | P2 | ShareList component | Share from UI | Valid share URL generated | [ ] | |

---

## 9. Profile & Personalization

| ID | Priority | Test | Steps | Expected | Status | Notes |
|----|----------|------|-------|----------|--------|-------|
| MM-PREF-001 | P0 | Set preferences | Profile: favorite genres, actors, dislikes | Saved via POST `/preferences` | [ ] | |
| MM-PREF-002 | P1 | Reload preferences | Refresh page | Same preferences shown | [ ] | |
| MM-PREF-003 | P1 | NL preference analysis | Enter free-text preferences | LLM extracts structured prefs | [ ] | |
| MM-PREF-004 | P1 | Taste profile updates | Like/dislike several movies | `/taste-profile` reflects changes | [ ] | |
| MM-PREF-005 | P2 | Vectorize / similarity | Two users with similar prefs (if testable) | Recommendations diverge appropriately | [ ] | |
| MM-PREF-006 | P2 | Watch history | Mark watched | Appears in history API | [ ] | |

---

## 10. Security

| ID | Priority | Test | Steps | Expected | Status | Notes |
|----|----------|------|-------|----------|--------|-------|
| MM-SEC-001 | P0 | JWT required on protected routes | Call without token | 401 on all protected endpoints | [ ] | |
| MM-SEC-002 | P0 | Invalid JWT | Bearer `invalid.token.here` | 401 | [ ] | |
| MM-SEC-003 | P1 | SQL injection | `' OR 1=1--` in login email | No leak, safe error | [ ] | |
| MM-SEC-004 | P1 | XSS in chat | Send `<script>alert(1)</script>` | Escaped in UI, not executed | [ ] | |
| MM-SEC-005 | P1 | Secrets not in frontend bundle | Search built JS for `TMDB_API_KEY`, `JWT_SECRET` | Not present | [ ] | |
| MM-SEC-006 | P2 | Rate limiting (if configured) | Burst 50 login attempts | Throttled or stable errors | [ ] | |
| MM-SEC-007 | P1 | Logout invalidates session | Logout then reuse old access token | 401 | [ ] | |

---

## 11. Performance & Reliability

| ID | Priority | Test | Steps | Expected | Status | Notes |
|----|----------|------|-------|----------|--------|-------|
| MM-PERF-001 | P1 | Homepage TTFB | `curl -w "%{time_total}"` | < 2s typical | [ ] | |
| MM-PERF-002 | P1 | Discovery API latency | Time GET `/api/discovery` | < 5s | [ ] | |
| MM-PERF-003 | P1 | Chat first token / response | Send chat message | < 30s for full response | [ ] | |
| MM-PERF-004 | P2 | Recommend workflow | Long NL search, poll status | Completes without timeout | [ ] | |
| MM-PERF-005 | P2 | Static asset caching | Second load of JS/CSS | Cache headers / 304 or fast load | [ ] | |
| MM-PERF-006 | P2 | Worker cold start | First request after idle | Acceptable delay, no 500 | [ ] | |

---

## 12. Cloudflare Worker & Data Layer

| ID | Priority | Test | Steps | Expected | Status | Notes |
|----|----------|------|-------|----------|--------|-------|
| MM-CF-001 | P0 | Worker direct URL | `curl workers.dev/trending` | Same data as proxied `/api` | [ ] | |
| MM-CF-002 | P1 | D1 connectivity | Any auth/write endpoint | No database connection errors | [ ] | |
| MM-CF-003 | P1 | Durable Objects | Chat + recommend in sequence | State consistent per user | [ ] | |
| MM-CF-004 | P2 | Workflow completion | Trigger search workflow | Results in D1/cache | [ ] | |
| MM-CF-005 | P2 | Workers AI | Preference analyze / chat intent | Valid JSON from Llama | [ ] | |
| MM-CF-006 | P2 | TMDB API key | Trending with new release | Current movies, not empty | [ ] | |
| MM-CF-007 | P2 | `wrangler tail` | Deploy test, watch logs | No unhandled exceptions | [ ] | |

---

## 13. End-to-End User Journeys

| ID | Priority | Journey | Steps | Expected | Status | Notes |
|----|----------|---------|-------|----------|--------|-------|
| MM-E2E-001 | P0 | New user onboarding | Signup → set preferences → first chat recommendation | Full flow without errors | [ ] | |
| MM-E2E-002 | P0 | Find and save movie | Discover trending → add to watchlist → verify list | Movie persisted | [ ] | |
| MM-E2E-003 | P1 | Chat-driven discovery | Ask for recommendations → add one to watchlist → write review | All linked data correct | [ ] | |
| MM-E2E-004 | P1 | Return user | Login → resume last conversation → send follow-up | Context maintained | [ ] | |
| MM-E2E-005 | P1 | Share with friend | Create shared list → open in incognito | Friend sees movies | [ ] | |
| MM-E2E-006 | P2 | Preference learning loop | Dislike 3 genres → ask vague recommend | Results skew away from dislikes | [ ] | |

---

## 14. Regression Checklist (Pre-Release)

Run all P0 items plus any areas changed in the release:

- [ ] MM-ENV-001, MM-INF-001–006, MM-AUTH-001–008
- [ ] MM-API-P-001–003, MM-API-A-003–006, MM-UI-001–005
- [ ] MM-CHAT-001, MM-E2E-001, MM-E2E-002
- [ ] Frontend build + deploy pipeline green
- [ ] No new errors in `wrangler tail` during smoke test

---

## 15. Known Issues & Test Notes

| Issue | Severity | Workaround |
|-------|----------|------------|
| Route is `/discover` not `/discovery` | Low | Use `/discover` in tests and docs |
| `/api/collections` returns empty `movies[]` in list view | Info | Movies populated in `/discovery` and detail endpoints |
| Last production deploy ~Jan 2026 | Info | Re-run GitHub Actions or `deploy.sh` after changes |
| Similar movies may include weak matches for some IDs | P2 | Verify TMDB similar API mapping |

---

## 16. Test Execution Log

| Date | Tester | Build/Commit | P0 Pass | P1 Pass | Blockers | Sign-off |
|------|--------|--------------|---------|---------|----------|----------|
| | | | / | / | | |

---

## Appendix A — Full API Route Reference

| Method | Path | Auth |
|--------|------|------|
| POST | `/auth/register` | No |
| POST | `/auth/login` | No |
| POST | `/auth/refresh` | No |
| POST | `/auth/logout` | Yes |
| GET | `/auth/me` | Yes |
| PUT | `/auth/profile` | Yes |
| POST | `/preferences` | Yes |
| GET | `/preferences` | Yes |
| POST | `/recommend` | Yes |
| GET | `/recommendations/:searchId` | Yes* |
| GET | `/status/:searchId` | Yes* |
| GET/POST | `/conversations` | Yes |
| GET/PUT/DELETE | `/conversations/:id` | Yes |
| POST | `/chat` | Yes |
| POST | `/chat/messages/:id/movies` | Yes |
| POST/GET | `/feedback`, `/feedback/:movieId` | Yes |
| GET | `/taste-profile` | Yes |
| GET/POST | `/watch-history` | Yes |
| GET/POST/PUT/DELETE | `/watchlist` | Yes |
| GET/POST | `/reviews/*` | Yes |
| POST/GET | `/shared-lists/*` | Mixed |
| GET/POST | `/collections/*` | Mixed |
| GET | `/similar/:movieId` | No |
| GET | `/trending` | No |
| GET | `/person/:personId` | No |
| GET | `/search/person` | No |
| GET | `/watch-providers/:movieId` | No |
| GET | `/discovery` | No |

\*Confirm auth requirements in `src/index.ts` for your deployment.

---

## Appendix B — Frontend Route Reference

| Path | Component | Protected |
|------|-----------|-----------|
| `/login` | LoginPage | No |
| `/signup` | SignupPage | No |
| `/` | HomePage | Yes |
| `/chat` | ChatPage | Yes |
| `/discover` | DiscoveryPage | Yes |
| `/collections` | CollectionsPage | Yes |
| `/watchlist` | WatchlistPage | Yes |
| `/profile` | ProfilePage | Yes |

---

*Document version: 1.0 — Created for MovieMind / AgenticAI_Movie_Recommender*
