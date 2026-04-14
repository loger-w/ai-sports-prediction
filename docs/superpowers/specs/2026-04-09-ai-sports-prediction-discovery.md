# Discovery Plan: AI Sports Prediction Website

**Date**: 2026-04-09
**Product Stage**: New Product
**Discovery Question**: Can we build a sustainable AI sports prediction platform that attracts daily returning users and is discoverable in a competitive market?

---

## Product Concept

A website that uses custom-built AI models (Claude Skills) to predict:
- **Game winners** (win probability %)
- **Over/under scores** (total points probability %)

Currently supports **NBA** and **MLB**, with architecture designed for future expansion to other sports (NFL, NHL, etc.).

### Competitive Differentiation

| Aspect | Competitor (dailymlbpicks.com) | Our Product |
|--------|-------------------------------|-------------|
| Prediction source | Compares 4 public AIs | Custom-built prediction models |
| Prediction types | Win/loss only | Win/loss + **over/under** |
| Sports coverage | MLB only | NBA + MLB (expandable) |
| Business model | Affiliate + ads | **Freemium (planned)** |
| Language | English only | **i18n (English + Chinese)** |

### Core Value Proposition
Custom AI-powered predictions with transparent accuracy tracking, offering both game winner and over/under analysis across multiple sports.

---

## Ideas Explored

Generated from PM, Designer, and Engineer perspectives:

| # | Idea | Perspective | Description |
|---|------|-------------|-------------|
| 1 | Daily prediction feed | PM | Show all games for the day with win probability and over/under odds |
| 2 | Historical accuracy dashboard | PM | Publicly track model hit rate to build user trust |
| 3 | High-confidence games prioritized | PM | Freemium core: free access to top picks, pay for the rest |
| 4 | Multi-sport modular architecture | Eng | Design for easy addition of NFL, NHL, etc. |
| 5 | Prediction notification subscription | PM | Email or Web Push alerts for high-probability games |
| 6 | Win rate trend charts | Design | Visualize model performance changes across seasons |
| 7 | Game detail explanation page | Design | Show key factors behind each AI prediction |
| 8 | User bet tracker | PM | Let users record bets and track personal performance |
| 9 | ~~Public API~~ | ~~Eng~~ | ~~Removed by user decision~~ |
| 10 | Community discussion | PM | Discussion threads under each game prediction |

### Selected Ideas for Validation
Ideas 1-8 and 10 carried forward (9 excluded).

---

## Critical Assumptions

### Value Assumptions
| # | Assumption | Related Ideas | Impact | Uncertainty |
|---|-----------|---------------|--------|-------------|
| V1 | Users will return daily to check predictions | 1, 5 | High | High |
| V2 | Users will use AI predictions as betting decision input | 1, 3 | High | Medium |
| V3 | Historical accuracy is the key trust factor | 2 | High | Medium |
| V4 | Users want to understand WHY the AI made a prediction | 7 | Medium | Low |
| V5 | Users want to track their own betting performance | 8 | Low | Medium |
| V6 | Users want to discuss predictions on the platform | 10 | Low | Medium |

### Usability Assumptions
| # | Assumption | Related Ideas | Impact | Uncertainty |
|---|-----------|---------------|--------|-------------|
| U1 | Users intuitively understand win % and over/under % | 1, 6 | Medium | Low |
| U2 | Trend charts are clear without explanation | 6 | Low | Low |
| U3 | Users will consistently record bets manually | 8 | Low | Medium |

### Feasibility Assumptions
| # | Assumption | Related Ideas | Impact | Uncertainty |
|---|-----------|---------------|--------|-------------|
| F1 | Model can reliably output predictions before each game | 1, 3 | High | Medium |
| F2 | Architecture supports adding new sports at low cost | 4 | Medium | Low |
| F3 | AI can generate human-readable prediction explanations | 7 | Medium | Low |
| F4 | Email/Web Push notification infrastructure is reliable | 5 | Low | Low |

### Viability Assumptions
| # | Assumption | Related Ideas | Impact | Uncertainty |
|---|-----------|---------------|--------|-------------|
| B1 | Free users will pay to unlock more predictions | 3 | High | High |
| B2 | Accuracy transparency increases paid conversion | 2, 3 | Medium | Medium |
| B3 | Notifications improve retention and willingness to pay | 5 | Medium | Low |
| B4 | Community discussion increases platform stickiness | 10 | Low | Medium |

### Go-to-Market Assumptions
| # | Assumption | Related Ideas | Impact | Uncertainty |
|---|-----------|---------------|--------|-------------|
| G1 | Target users can find the platform via search or social | All | High | High |
| G2 | Community features require critical mass (cold start) | 10 | Medium | Medium |
| G3 | Free predictions can serve as effective user acquisition | 1, 3 | Medium | Medium |

### Priority Matrix

**Must validate first (High Impact x High Uncertainty):**
1. **B1** — Will users pay for more predictions?
2. **V1** — Will users return daily?
3. **G1** — Can users find us in a competitive market?
4. **V2** — Will users trust AI predictions enough to act on them?

**User chose to validate V1 and G1 first** (since the initial phase is free, B1 can wait).

---

## Validation Experiments

### Experiment 1: Daily Return Rate (validates V1)

| Field | Detail |
|-------|--------|
| Tests Assumption | V1 — Users will return daily to check predictions |
| Method | Social media simulation test |
| Duration | 2 weeks |
| Effort | Low (time only, zero cost) |

**Setup:**
- Post daily AI predictions on **X/Twitter** (English market) and **Threads** (Chinese market)
- Fixed format: today's highest-confidence game (free) + teaser for remaining predictions
- Next-day follow-up: post yesterday's results and hit rate

**Success Criteria:**
| Metric | Threshold |
|--------|-----------|
| Follower growth | 100+ in 2 weeks |
| Daily post engagement rate | > 3% |
| Users asking for "full predictions" | > 10 people |
| Repeat users checking next-day results | > 30% |

### Experiment 2: Discoverability (validates G1)

| Field | Detail |
|-------|--------|
| Tests Assumption | G1 — Target users can find the platform |
| Method | SEO keyword research + landing page test |
| Duration | 2 weeks (parallel with Experiment 1) |
| Effort | Low (free tools) |

**Method A: SEO Keyword Validation (Week 1)**
- Research search volume for target keywords:
  - English: "NBA predictions today", "MLB picks today", "AI sports predictions"
  - Chinese: "NBA 預測", "MLB 預測", "AI 球賽預測"
- Analyze competitor ranking strength for these keywords
- Identify low-competition niches

**Method B: Landing Page Test (Weeks 1-2)**
- Build a simple one-page landing page (Carrd or similar)
- Include email subscription form: "Get daily AI predictions"
- Drive traffic from Experiment 1's social media posts

**Success Criteria:**
| Metric | Threshold |
|--------|-----------|
| Keyword monthly search volume (English) | > 5,000/month |
| Low-competition niche keywords found | 3+ |
| Landing page visit-to-subscribe conversion | > 10% |
| Email subscribers in 2 weeks | > 50 |

---

## SEO & Growth Strategy

### Programmatic SEO (Biggest Leverage)
- Auto-generate a page per game: `/nba/lakers-vs-celtics-2026-04-10`
- Each page naturally matches user search intent ("Lakers vs Celtics prediction today")
- More games = more pages = compounding long-tail traffic

### Content Freshness
- Daily predictions = daily new content; search engines crawl more frequently
- Yesterday's results review pages double content output

### Technical SEO
- Use SSR/SSG (Next.js recommended) so search engines can crawl content
- Implement `SportsEvent` schema markup for Rich Snippets
- Hit Core Web Vitals benchmarks

### i18n Strategy
- English + Chinese from launch to capture both markets
- Separate URL paths: `/en/...` and `/zh/...`

### Niche Keyword Targeting
Avoid competing for head terms; target modifiers:
- "AI NBA predictions today"
- "NBA over under predictions"
- "MLB AI picks free"

### Social Distribution Channels
| Channel | Market | Strategy |
|---------|--------|----------|
| X (Twitter) | English | Daily predictions + results, #NBABets #MLBPicks |
| Threads | Chinese | Same format, localized |
| Reddit | English | r/sportsbetting, r/sportsbook — organic participation |
| PTT | Chinese | Sport_Bet, NBA boards — share predictions |
| Discord | Both | Join/create sports betting communities |

---

## Discovery Timeline

```
Week 1: SEO keyword research + start social posting + build landing page
Week 2: Continue social posting + collect data
Week 3: Analyze results -> make decision
```

---

## Decision Framework

| Experiment 1 (V1) | Experiment 2 (G1) | Action |
|--------------------|-------------------|--------|
| Pass | Pass | Build the website. Prioritize daily prediction page + SEO optimization |
| Pass | Fail | Product has value but needs alternative acquisition (paid ads, KOL, forums) |
| Fail | Pass | Search demand exists but product format needs adjustment (stronger differentiation or stickiness) |
| Fail | Fail | Re-evaluate target market or product positioning. Consider pivot |

---

## Next Steps (After Validation)

- Create a PRD for the MVP (daily prediction page + historical accuracy)
- Design interview script for sports bettors
- Set up metrics dashboard for tracking experiments
- Estimate effort and create user stories for MVP development
