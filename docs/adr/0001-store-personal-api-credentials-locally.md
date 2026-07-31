# ADR-0001: Store personal API credentials locally

- Status: Accepted
- Date: 2026-07-31

## Context

The API usage panel needs a bearer API key to query the user's quota. This is
a personal extension used by one person. Hard-coding the credential would put
it in source control and require a rebuild whenever the key changes. Syncing
it through the user's Chrome account would expand where the credential is
copied without providing a benefit for this use case. A backend credential
proxy would add unnecessary infrastructure for a single-user tool.

## Decision

The API key is entered and edited inline in the popup. It is stored through
the repository's storage utility using `chrome.storage.local`, never in source
code or sync storage.

When editing, the saved value is populated into a password input. The input is
masked by default and has an explicit show/hide control. Requests send the key
only as a bearer token to the fixed usage API endpoint. Application logs must
not include the key or request authorization headers.

The last successful usage response and its query time may also be stored in
local storage so the popup can render a cached snapshot while refreshing.

## Consequences

- Changing a key does not require rebuilding the extension.
- The credential is not committed to Git or synchronized by Chrome storage.
- The local Chrome profile and the extension can still access the plaintext
  credential; this is local persistence, not secure-vault encryption.
- A key exposed in source, logs, screenshots, or conversation history must be
  revoked and replaced.
- Supporting shared credentials or distributing a centrally managed key would
  require a new decision, likely involving a backend proxy.
