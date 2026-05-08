---
description: 'Core postflight flow — takes one Lens session closeout and runs commit, push, and cleanliness verification across touched repos.'
---

# /lens-postflight

Load `{project-root}/lens.core/_bmad/lens-work/prompts/lens-postflight.prompt.md` and follow it exactly.

When asked for user input, use `vscode_askQuestions` if available. If `vscode_askQuestions` is not available, render the numbered menu and STOP.

This prompt is only a redirect. Do not add prompt-local business logic.