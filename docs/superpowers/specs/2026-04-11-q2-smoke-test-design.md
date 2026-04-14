# Q2: Smoke Test Design

## Overview

A manual browser-based smoke test checklist to verify all user-facing features work after deployment. This is distinct from Phase 4 SEO tests — smoke tests cover **functional correctness** from a user perspective.

## Prerequisites

- App deployed and accessible at production URL
- At least one day of prediction data in Supabase (run ingest first)
- At least one resolved game for accuracy page (or accept empty state)

## Smoke Test Checklist

### 1. Root Redirect

| Step | Action | Expected |
|------|--------|----------|
| 1.1 | Navigate to `/` | Redirects to `/en/predictions` |
| 1.2 | Check browser URL | Shows `/en/predictions` |

### 2. Predictions Page (`/en/predictions`)

| Step | Action | Expected |
|------|--------|----------|
| 2.1 | Page loads | Shows header with "AISports" logo, nav links (Predictions, Accuracy) |
| 2.2 | Game cards visible | At least one GameCard displays with team names, win probabilities, O/U line |
| 2.3 | Sport filter — click "NBA" | Only NBA games shown; NBA pill is active |
| 2.4 | Sport filter — click "MLB" | Only MLB games shown; MLB pill is active |
| 2.5 | Sport filter — click "All" | All games shown again |
| 2.6 | Date filter — click "Tomorrow" | Shows tomorrow's games (or empty state if none) |
| 2.7 | Date filter — click "This Week" | Shows this week's games |
| 2.8 | Date filter — click "Today" | Back to today's games |
| 2.9 | Confidence filter (advanced) | Open advanced filters, toggle "High" — only high-confidence games shown |
| 2.10 | Direction filter (advanced) | Toggle "Home" — only home-predicted games shown |
| 2.11 | Reset filters | All filters cleared, back to default view |
| 2.12 | Click a GameCard | Navigates to game detail page |

### 3. Game Detail Page (`/en/{sport}/{slug}`)

| Step | Action | Expected |
|------|--------|----------|
| 3.1 | Page loads | Shows game header with team names, sport badge, time |
| 3.2 | Prediction details | Win probability bar, O/U display, explanation text visible |
| 3.3 | If game is final | Shows "Final" badge, scores displayed |
| 3.4 | Back link | Click back link → returns to `/en/predictions` |

### 4. Accuracy Page (`/en/accuracy`)

| Step | Action | Expected |
|------|--------|----------|
| 4.1 | Click "Accuracy" in nav | Navigates to `/en/accuracy` |
| 4.2 | Overview stats | Shows Total Games, Winner Accuracy %, O/U Accuracy % cards |
| 4.3 | By-sport breakdown | NBA and MLB sections with individual stats |
| 4.4 | Trend chart | ApexCharts line chart renders (or empty state if insufficient data) |

### 5. Language Switching

| Step | Action | Expected |
|------|--------|----------|
| 5.1 | On `/en/predictions`, click language toggle | URL changes to `/zh/predictions` |
| 5.2 | UI language | All labels switch to Chinese (預測, 準確率, etc.) |
| 5.3 | Team names | Show Chinese team names (洛杉磯湖人, etc.) |
| 5.4 | Game detail | Navigate to a game — explanation shows `explanation_zh` |
| 5.5 | Toggle back to EN | URL changes to `/en/...`, all text back to English |

### 6. Responsive Design (Mobile)

| Step | Action | Expected |
|------|--------|----------|
| 6.1 | Resize to mobile width (< 768px) | MobileFilterBar appears at top |
| 6.2 | Sport pills visible | Horizontal scroll of sport filter pills |
| 6.3 | Date pills visible | Horizontal scroll of date filter pills |
| 6.4 | Advanced filters | Tap filter icon → sheet opens with Confidence + Direction |
| 6.5 | Game cards stack | Single column layout |
| 6.6 | Desktop sidebar hidden | Sidebar filters not visible on mobile |

### 7. Error States

| Step | Action | Expected |
|------|--------|----------|
| 7.1 | Navigate to `/en/nba/nonexistent-slug` | Shows "Game not found" or 404 state |
| 7.2 | Navigate to `/xx/predictions` (invalid lang) | Redirects to `/en/predictions` or shows error |
| 7.3 | Disconnect network, reload page | Error state with retry button |

## Relationship to Phase 4 SEO Tests

Smoke tests and SEO tests are **different concerns with partial overlap**:

| Aspect | Smoke Test | Phase 4 SEO Test |
|--------|-----------|------------------|
| Focus | User-facing functionality | Search engine visibility |
| Method | Manual browser interaction | curl with Googlebot UA, structured data validators |
| Overlap | Both verify pages load | — |
| Unique to SEO | — | JSON-LD schema validation, sitemap, bot prerender |

Phase 4 SEO tests are documented separately and should be run after smoke tests pass.

## When to Run

- After every deployment
- After any frontend changes (components, routes, i18n)
- After database schema changes that affect displayed data
- Before sharing the URL publicly
