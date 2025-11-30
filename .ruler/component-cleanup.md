---
description: component size and structure rules for code cleanup
argument-hint: CODEFILES=<component-files-to-review>
---

<CODEFILES>
$CODEFILES
</CODEFILES>

# Code Rules

## 1. Component size and structure

- One main component per file (`.tsx`), file name matches component name.
- Soft target: 150–250 LOC per component file (imports and types excluded).
- Hard cap: 600 LOC per component file. If a file hits 400+ LOC, split it.
- Move view-only chunks into small presentational components.
- Move state/logic into custom hooks or utility functions instead of keeping it in the main component.
- Avoid deeply nested JSX. If you nest more than 3 levels, extract a subcomponent.
