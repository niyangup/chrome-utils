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

### Cached usage snapshot

The most recent successful API usage response and its query time. The popup
shows this snapshot immediately when opened, then replaces it after the
automatic refresh succeeds.
