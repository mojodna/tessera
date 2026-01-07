# Pre-commit Hook Setup

To ensure tests pass before commits:

```bash
# .git/hooks/pre-commit
#!/bin/sh
npm test
```

Then make it executable:

```bash
chmod +x .git/hooks/pre-commit
```
