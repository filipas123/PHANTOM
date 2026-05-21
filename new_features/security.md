# New Features - Security

## What we have
- Basic secure parameter isolation.

## What we want
- Ensure new code demo tool doesn't introduce XSS or unescaped HTML execution unless requested.

## What is done
- Ensured iframe srcdoc sandbox policies are utilized for code demo payloads.
