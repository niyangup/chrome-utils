# Chrome Utils Domain Context

Chrome Utils is a personal Manifest V3 browser extension that groups small,
task-focused browser utilities into one popup.

## Glossary

### Shortcut

An action in the popup that opens a target page or starts a page-specific
workflow. A shortcut is not a general-purpose status display.

### API usage panel

A persistent summary below the popup header that shows the configured API
key's current quota. It is separate from the shortcut list so quota remains
visible as more shortcuts are added.

### API key

The user's personal bearer credential for the usage API. It is configured in
the API usage panel and stored only in the extension's local storage. See
[ADR-0001](docs/adr/0001-store-personal-api-credentials-locally.md).

### Subscription usage panel

A persistent summary below the API usage panel that shows the configured
OpenCode subscription's five-hour and seven-day capacity. It is an independent
panel with its own access token, cache, and error state, but shares the API
usage panel's manual refresh action.

### Subscription access token

The user's bearer credential for the fixed OpenCode subscription usage
endpoint. It is edited in the subscription usage panel and stored only in
local storage under a separate key from the API key.

### Granted quota

The maximum usable quota reported by the API as `total_granted`.

### Used quota

The consumed quota reported by the API as `total_used`.

### Available quota

The remaining quota reported by the API as `total_available`. This is the
primary value shown in the API usage panel.

### Dollar quota

The user-facing representation of a raw quota value. Convert every raw quota
field with `dollars = raw value / 500000`, then display dollar amounts to two
decimal places.

### Usage percentage

The proportion of granted quota already consumed:
`total_used / total_granted * 100`. Display it to one decimal place and use it
as the progress bar value.

### Rolling usage

OpenCode's five-hour window. Its `percent` value means the proportion already
used. The subscription usage panel uses it for the progress bar and primary
"已用" percentage.

### Weekly remaining quota

OpenCode's seven-day window. Its `percent` value means the proportion
remaining, so the subscription usage panel displays it directly as the `7d`
value beneath the progress bar.

### Cached usage snapshot

The most recent successful API usage response and its query time. The popup
shows this snapshot immediately when opened, then replaces it after the
automatic refresh succeeds.
