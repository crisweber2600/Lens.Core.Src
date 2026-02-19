# User Interaction Keywords — LENS Workflow Control

This document defines special keywords you can use to control workflow behavior when prompted for input during phase workflows (`/pre-plan`, `/spec`, `/plan`, `/review`, `/dev`).

---

## Keywords & Scope

### 1. **"defaults" / "use defaults" / "best defaults"**

**Scope:** **CURRENT STEP ONLY**

**Behavior:**
- Applies default values to the current question or step
- Skips detailed prompting for that step
- Workflow resumes normal interactive behavior for subsequent steps/questions
- Each step can have its own defaults applied independently

**Example:**
```
You are prompted: "Q4.1: What's the primary success metric?"

You respond: "best defaults"

→ Agent fills in sensible defaults for Q4.1
→ Continues to Q4.2, Q4.3, etc. with normal prompting
→ Returns to menu asking what to do next (continue, pause, show status)
```

**Use Case:** When you're confident about a particular step but want to stay engaged for later decisions.

---

### 2. **"yolo" / "keep rolling" / "go hard"**

**Scope:** **ENTIRE REMAINING WORKFLOW**

**Behavior:**
- Applies defaults to all remaining steps in the current workflow
- No further prompting for questions within the workflow
- Automatically generates all artifacts with sensible defaults
- Completes the entire phase/workflow without interruption
- Returns final menu only after workflow completion

**Example:**
```
You're at the product brief workflow, Step 4 (success metrics):

You respond: "yolo"

→ Agent fills in defaults for Q4.1, Q4.2, Q4.3
→ Automatically generates and appends success metrics content
→ Auto-completes Step 5 (scope), Step 6 (complete)
→ Finishes entire /spec workflow
→ Presents final menu: "Continue to /plan? [1] Yes [P] Pause [S] Status"
```

**Use Case:** When you have a clear vision and want rapid progress; you'll review/refine artifacts later.

---

### 3. **"all questions" / "batch questions" / "all at once"**

**Scope:** **ENTIRE WORKFLOW WITH ITERATIVE REFINEMENT**

**Behavior:**
- Presents ALL questions from ALL workflow steps upfront in a single comprehensive questionnaire
- User answers all questions in one batch response
- Agent analyzes answers and generates follow-up clarifying questions based on responses
- Runs adversarial review (party mode) on the proposed direction
- Asks final series of questions to address gaps or concerns from review
- Generates all workflow artifacts after final answers
- Returns final menu after complete workflow

**Example:**
```
You're starting /spec (Planning phase):

You respond: "all questions"

→ Agent presents comprehensive questionnaire covering PRD, UX, Architecture
→ You answer all questions in one response
→ Agent asks 3-5 follow-up questions: "You said X, does that mean Y?"
→ Party mode adversarial review runs with diverse perspectives
→ Agent asks final 2-3 questions to address review findings
→ All planning artifacts generated (PRD, UX design, architecture docs)
→ Presents final menu: "Continue to /plan? [1] Yes [P] Pause [S] Status"
```

**Workflow Stages:**
1. **Initial Questionnaire** — All workflow questions presented upfront
2. **Batch Answer Collection** — User provides comprehensive answers
3. **Follow-up Clarification** — 3-5 targeted questions based on answers
4. **Adversarial Review** — Party mode review of proposed direction
5. **Final Questions** — 2-3 questions addressing review findings
6. **Artifact Generation** — Complete workflow artifacts created

**Use Case:** When you want to provide all context upfront, but still want iterative refinement and validation before finalizing artifacts.

---

### 4. **"skip" / "skip to [step-name]"**

**Scope:** **JUMP TO NAMED STEP**

**Behavior:**
- Skips intermediate steps in a workflow
- Can be used to jump to a specific well-known step (e.g., "skip to product brief")
- Only valid for steps marked as *optional* in the workflow
- Cannot skip mandatory steps (gates)
- Returns to normal prompting when landing on target step

**Example:**
```
In /pre-plan (Analysis phase), after brainstorming:

You respond: "skip to product brief"

→ Skips "Research" step
→ Lands on "Product Brief" workflow
→ Begins normal questioning for product brief
```

**Use Case:** When you already have research or analysis done externally and want to jump ahead.

---

### 5. **"pause" / "pause here" / "hold up"**

**Scope:** **IMMEDIATE WORKFLOW STOP**

**Behavior:**
- Halts workflow at current step
- Saves all progress to state files
- Does NOT auto-complete any remaining steps
- Commits state to git with message indicating pause point
- User can `resume` later from the exact same position

**Example:**
```
During /spec workflow:

You respond: "pause"

→ Workflow halts at current step
→ All artifacts saved
→ State files updated with pause metadata
→ Git commit: "workflow: Pause /spec at Product Brief definition"
→ Later, user can run `/spec` again to resume from pause point
```

**Use Case:** When you need to step away, gather more context, or consult stakeholders before continuing.

---

### 6. **"back" / "previous" / "redo [step]"**

**Scope:** **GO BACK TO PREVIOUS STEP**

**Behavior:**
- Rolls back to the previous step in workflow
- Clears outputs generated from the reverted step
- Restores state to pre-step condition
- Allows re-answering questions differently
- Works only within the current workflow (can't go back to previous workflows/phases)

**Example:**
```
You're at Step 4 (success metrics), realize you need to change user personas:

You respond: "back"

→ Rolls back to Step 3 (User Personas)
→ Clears success metrics content from document
→ Allows you to re-answer persona questions
→ Continues forward when done
```

**Use Case:** When new information makes you want to reconsider earlier decisions.

---

## Keyword Resolution Rules

These keywords are recognized at any user prompt in lens-work workflows:

1. **Exact Match:** Keyword can be lowercase, and variations (e.g., "best defaults", "use defaults", "defaults") are equivalent
2. **First Match:** If multiple keywords appear in user input, only the first recognized is applied (e.g., "yolo, then pause" → "yolo" applies)
3. **Context-Aware:** Keywords have no effect outside of LENS workflows; they're ignored in compass menu selections
4. **Cascading Defaults:** When "yolo" is used, each step applies its own set of defaults in sequence

---

## Workflow-Level Keyword Behavior

### Keyword Scoping Per Phase

| Phase | Keyword | Effect | Common Use |
|-------|---------|--------|-----------|
| `/pre-plan` (Analysis) | "defaults" | Fills current question; continues prompting | Skip a non-essential question |
| `/pre-plan` | "yolo" | Auto-completes all remaining steps → product brief | Rapid prototyping with defaults |
| `/pre-plan` | "all questions" | All questions upfront → follow-ups → review → generate | Comprehensive context available |
| `/pre-plan` | "pause" | Halts; saves state; can resume later | Need to research before continuing |
| `/spec` (Planning) | "defaults" | Fills current question; resumes normal flow | Quick decision on specific aspect |
| `/spec` | "yolo" | Auto-generates PRD, UX design, epics | Known architecture; want rapid output |
| `/spec` | "all questions" | All PRD/UX/Arch questions → refinement → party mode | Want iterative validation |
| `/plan` (Solutioning) | "defaults" | Fills steps; continues normally | Stick with sensible defaults |
| `/plan` | "yolo" | Full solutioning: architecture→epics→stories | Very clear requirements |
| `/plan` | "all questions" | All architecture questions → follow-ups → review | Complex architecture decisions |
| `/dev` (Implementation) | "defaults" | Fills steps; continues normally | Straightforward story selection |
| `/dev` | "yolo" | Sprint auto-plan: stories→tasks→CI setup | Known sprint, clear backlog |
| `/dev` | "all questions" | All sprint questions → follow-ups → validation | Sprint needs careful planning |

---

## State Management with Keywords

All keyword-driven workflows update state consistently:

```yaml
# state.yaml tracks keyword usage
workflow_status:
  last_keyword: "yolo"  # Records which keyword was used
  auto_completed_steps: [1, 2, 3, 4]  # Tracks which steps were auto-filled
  paused_at: null  # Populated if paused mid-workflow
  resumable: false  # true if workflow can be resumed from current point
```

---

## Best Practices

### When to Use "defaults":
- ✅ You're confident about the current step
- ✅ You want to stay engaged for later steps
- ✅ One decision doesn't affect others much

### When to Use "yolo":
- ✅ You have a clear vision for the feature
- ✅ You're confident in sensible defaults
- ✅ You want rapid artifact generation for review
- ✅ You'll refine/adjust artifacts in code review later

### When to Use "all questions":
- ✅ You have comprehensive context and can answer all questions upfront
- ✅ You want to provide complete information in one session, then refine
- ✅ You value iterative refinement with follow-ups and adversarial review
- ✅ You want validation checkpoints before finalizing artifacts
- ✅ The phase is complex and benefits from diverse perspectives (party mode)

### When to Use "pause":
- ✅ You need external input (stakeholders, research)
- ✅ You want to reflect before continuing
- ✅ You're blocked on a dependency
- ✅ You need to switch contexts

### When NOT to Use "yolo":
- ❌ You're uncertain about requirements
- ❌ You're defining a new domain/service for the first time
- ❌ You need stakeholder buy-in on each step
- ❌ You want detailed artifact control

---

## FAQ

**Q: Can I use "yolo" for just one workflow, then resume normal prompting?**
A: Yes. "yolo" applies only to the current workflow. The next phase resumes normal interaction.

**Q: Can I use "defaults" on one step, then "yolo" later in the same workflow?**
A: Yes. You can mix keywords per-step. "defaults" on Q1, "yolo" starting at Q3 → auto-completes Q3+ while respecting Q1-Q2 answers.

**Q: Does "pause" save my work?**
A: Yes. All artifacts are saved, state is committed, and you can resume exactly where you left off.

**Q: What if I "yolo" but want to revisit a step?**
A: Use "back" to roll back to that step, answer differently, and continue forward.

**Q: What's the difference between "yolo" and "all questions"?**
A: "yolo" uses defaults throughout without asking you anything. "all questions" presents all questions upfront, waits for your comprehensive answers, then iteratively refines with follow-ups and party mode review before generating artifacts.

**Q: How many follow-up questions will "all questions" ask?**
A: Typically 3-5 clarifying questions after your initial answers, then 2-3 final questions after the adversarial review. The exact number depends on the complexity of your answers and review findings.

**Q: Can I skip the adversarial review in "all questions" mode?**
A: Not by default—the review is part of the iterative refinement that makes "all questions" valuable. If you want to skip validation, use "yolo" instead.

**Q: What if I can't answer all questions upfront with "all questions"?**
A: You can answer the ones you know and say "unsure" or "TBD" for others. The follow-up questions will focus on clarifying those areas.

---

## Implementation Notes for Agents

When an agent implementing a workflow encounters a keyword:

1. **"defaults"** → Skip detailed elicitation for current step; fill frontmatter; continue to next question
2. **"yolo"** → Set `auto_complete_mode: true`; apply defaults to all remaining steps; suppress prompts
3. **"all questions"** → Enter batch mode:
   - Collect all questions from all workflow steps
   - Present comprehensive questionnaire
   - Wait for batch answers
   - Analyze answers and generate 3-5 follow-up questions
   - Run `party-mode` adversarial review on proposed direction
   - Ask 2-3 final questions addressing review findings
   - Generate all workflow artifacts
   - Log: `{"keyword": "all_questions", "questionnaire_steps": 6, "follow_ups": N, "review_findings": M}`
4. **"pause"** → Halt execution; call `casey.commit-state(status: paused)`; exit workflow
5. **"back"** → Clear outputs from current step; revert to previous step; reload step file
6. **"skip"** → Validate step is optional; jump to target step; resume normal flow

All keyword handling must preserve audit trail in event-log.jsonl with timestamp and keyword used.
