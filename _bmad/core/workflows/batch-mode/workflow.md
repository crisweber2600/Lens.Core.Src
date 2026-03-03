# Batch Mode Protocol

**Purpose:** Generic batch-mode execution for step-based workflows. Instead of halting at each step's menu for user interaction, generate all remaining content in one pass, then present a summary for review and refinement.

**Activation:** User selects `[B]` at any step menu, OR profile has `question_mode: batch`.

---

## HOW BATCH MODE WORKS

When batch mode is activated mid-workflow:

1. **Snapshot** the current step number and all content generated so far
2. **Execute all remaining steps** sequentially, generating content for each without halting at menus
3. **Simulate expert user input** where steps require user decisions — make reasonable, domain-appropriate choices
4. **Save content** to the output file after each step (append-only, as normal)
5. **Track decisions** made on behalf of the user in a batch summary
6. After all steps complete, **present the Batch Review**

---

## BATCH EXECUTION RULES

### Content Generation

- Follow every step file's instructions exactly — sequence, structure, formatting
- Generate content using the same quality standards as interactive mode
- Use all available context (loaded documents, prior step content, domain knowledge)
- When a step requires user input or a decision, make the most reasonable expert choice and log it

### State Tracking

- Update frontmatter `stepsCompleted` after each step, as normal
- Continue loading step files one-at-a-time in sequence (JIT loading still applies)
- Read each step file fully before executing

### What Batch Mode Does NOT Change

- Step execution order — still sequential, no skipping
- Content quality — same depth and detail as interactive
- File output — still saves to the output file at each step
- Frontmatter updates — still tracked normally

---

## BATCH REVIEW PROTOCOL

After all remaining steps have been executed, present the following:

### 1. Completion Summary

```
## 🔄 Batch Mode Complete

**Steps Processed:** [first batch step] through [last step]
**Content Generated:** [brief list of sections/content areas]
```

### 2. Decisions Made

List every decision or assumption made on behalf of the user:

```
### Decisions & Assumptions Made:

1. **Step [N] - [Step Name]:** [Decision made and rationale]
2. **Step [N] - [Step Name]:** [Decision made and rationale]
...
```

### 3. Section Summaries

For each step processed in batch, provide a 2-3 sentence summary of what was generated:

```
### Section Summaries:

**Step [N]: [Name]** — [Summary of generated content, key points covered]
**Step [N]: [Name]** — [Summary of generated content, key points covered]
...
```

### 4. Review Menu

```
**Batch Review Options:**
[R] Review a specific section (specify step number)
[E] Edit a specific section (specify step number and changes)
[A] Advanced Elicitation on a specific section
[P] Party Mode on a specific section
[D] Done — accept all content as-is
```

#### Review Menu Handling:

- **IF R[N]:** Display the full generated content for step N, then redisplay review menu
- **IF E[N]:** User provides changes for step N → apply edits to that section in the output file → redisplay review menu
- **IF A[N]:** Run Advanced Elicitation on step N's content → ask user to accept improvements → update if yes → redisplay review menu
- **IF P[N]:** Run Party Mode on step N's content → ask user to accept improvements → update if yes → redisplay review menu
- **IF D:** Accept all content and complete the workflow normally
- **IF Any other comments:** Help user, then redisplay review menu

---

## ACTIVATION INTEGRATION

### From Step Menus (MD-based workflows)

When a step file presents a menu and user selects `[B]`:

1. Complete the current step's content generation (as if user selected `[C]`)
2. Save content and update frontmatter for current step
3. Enter batch mode for ALL remaining steps
4. Follow Batch Execution Rules above
5. Present Batch Review Protocol when complete

### From Workflow Engine (YAML-based workflows)

When a `template-output` pause presents options and user selects `[B]`:

1. Save the current section's content (as if user selected `[C]`)
2. Enter batch mode for ALL remaining instruction steps
3. Follow Batch Execution Rules above
4. Present Batch Review Protocol when complete

### From Profile Configuration

When `question_mode: batch` is set in the user's profile:

1. At workflow start, inform user: "**Batch mode active** (from profile). All steps will be generated continuously."
2. Execute step 1 normally (init steps always run interactively)
3. After step 1 completes, enter batch mode for all remaining steps
4. Follow Batch Execution Rules above
5. Present Batch Review Protocol when complete

---

## CRITICAL RULES

- ✅ Batch mode is **opt-in only** — never activate automatically unless profile says so
- ✅ Init steps (step 1, step 1b) always execute interactively, even in batch mode
- ✅ Every decision made on behalf of the user MUST be logged in the batch summary
- ✅ Content quality must match or exceed interactive mode quality
- ✅ The Batch Review at the end is MANDATORY — never skip it
- ❌ NEVER enter batch mode without explicit user activation ([B] selection or profile setting)
- ❌ NEVER skip the review protocol after batch generation
- ❌ NEVER reduce content quality or depth because of batch mode
