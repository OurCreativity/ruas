# Security Policy

## Supported versions
Only the latest minor release (currently 1.3.x) receives security fixes.

## Reporting a vulnerability
Please **do not** open a public issue. Use GitHub's
[private vulnerability reporting](https://github.com/OurCreativity/ruas/security/advisories/new)
or email kou.real@outlook.com. Expect an acknowledgement within 72 hours.

## Scope
Ruas runs fully offline and sends no code to external services. Relevant issues include
path traversal during indexing/export, arbitrary file write via `docgen`/`export`/`vibe`,
and unsafe handling of untrusted repositories by the MCP server.
