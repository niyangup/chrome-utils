# ADR-0002: Display OpenCode subscription usage alongside API usage

- Status: Accepted
- Date: 2026-08-19

## Context

The popup already displays the configured API key's quota. The extension also
needs to show the user's OpenCode subscription usage from a fixed usage
endpoint. OpenCode reports several windows with different percentage meanings:
`rolling.percent` is the amount used in the five-hour window, while
`weekly.percent` is the amount remaining in the seven-day window.

The popup must let the user provide the OpenCode bearer credential without
mixing it with the existing API key, and one refresh action should update both
usage summaries.

## Decision

Add a separate subscription usage panel below the API usage panel and above the
shortcut list. The panel stores an `accessToken` in `chrome.storage.local`,
uses a password input with an inline edit flow, and sends the token only as a
Bearer credential to the fixed endpoint
`https://opencode.ai/zen/go/v1/usage` through the background service worker.

The panel renders the five-hour `rolling.percent` as the progress bar and the
primary "已用" percentage. It renders remaining values beneath the bar as:

- `5h`: `100 - rolling.percent`
- `7d`: `weekly.percent`

The remaining values are clamped to `0%` through `100%`. The monthly window and
all reset timestamps are intentionally not displayed. Non-`ok` rolling or
weekly statuses retain the returned values but mark the panel as anomalous.
The progress color follows the existing healthy/warning/critical thresholds,
with an error color for anomalous statuses.

The existing API usage refresh button remains the shared refresh action. It
refreshes both configured panels; each panel keeps its own cache and error
state. Saving a credential triggers a refresh for that panel, and opening the
popup refreshes every panel whose credential is configured.

## Consequences

- Users can compare API quota and OpenCode subscription capacity in one popup.
- The two credentials remain isolated and are not stored in source control or
  Chrome sync storage.
- The popup has one manual refresh affordance instead of one per data source.
- The subscription panel can preserve and render its last successful snapshot
  while a refresh is in flight or when the next request fails.
- The endpoint contract is intentionally narrow; supporting additional
  subscription windows or reset-time displays requires a new UI decision.
