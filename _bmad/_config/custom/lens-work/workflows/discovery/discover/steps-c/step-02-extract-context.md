---
name: 'step-02-extract-context'
description: 'Extract git and JIRA context'
nextStepFile: './step-03-analyze-codebase.md'
---

# Step 2: Extract Context

## Goal
Extract business context from git history and optional JIRA references. Build a narrative of why the code exists and what business problems it solves.

## Instructions

### 1. Extract Git Commit History
For each target in `discovery_target.queue`:

```bash
cd {target.path}

# Get commit history with full details
git log --format="%H|%ai|%an|%ae|%s|%b" --since="1 year ago" -500

# Parse into structured data
# sha|datetime|author_name|author_email|subject|body
```

Build commit analysis:
```yaml
git_context:
  total_commits: N
  date_range:
    first: ISO8601
    last: ISO8601
    
  contributors:
    - name: string
      email: string
      commit_count: N
      last_commit: ISO8601
      
  commit_frequency:
    last_7_days: N
    last_30_days: N
    last_90_days: N
    
  activity_trend: increasing|stable|declining
```

### 2. Extract JIRA/Issue References
Parse commit messages for issue keys:

```python
# Common patterns
patterns = [
    r'[A-Z]{2,10}-\d{1,6}',     # JIRA: PROJ-123
    r'#\d+',                     # GitHub: #123
    r'GH-\d+',                   # GitHub explicit: GH-123
    r'fixes? #?\d+',             # "fixes #123" or "fix 123"
    r'closes? #?\d+',            # "closes #123"
]

# Extract from subject + body
for commit in commits:
    refs = extract_all_patterns(commit.subject + commit.body)
    collect(refs)
```

Build reference index:
```yaml
issue_references:
  jira_keys:
    - key: "AUTH-123"
      mentions: 5
      commits: ["sha1", "sha2", ...]
      date_range: [first_mention, last_mention]
      
  github_issues:
    - number: 45
      mentions: 2
      commits: [...]
```

### 3. Enrich with JIRA Context (Conditional)
**If `enable_jira_integration == true` AND JIRA reachable:**

For each unique JIRA key (prioritize most-referenced):
```
GET /rest/api/2/issue/{key}?fields=summary,description,issuetype,status,priority,labels
```

Build JIRA context:
```yaml
jira_context:
  - key: "AUTH-123"
    summary: "Implement OAuth2 refresh token flow"
    type: Story
    status: Done
    priority: High
    labels: ["security", "api"]
    relevance_score: 0.9  # based on mention frequency
    
  - key: "AUTH-456"
    summary: "Fix token expiration bug"
    type: Bug
    status: Done
    ...
```

**If JIRA unavailable:**
```yaml
jira_context:
  status: unavailable
  reason: "JIRA integration disabled"|"Connection failed"
  fallback: "Using commit messages only"
```

### 4. Extract Semantic Commit Analysis
Categorize commits by type:

```yaml
commit_categories:
  features:
    count: N
    commits: [...]
    keywords: ["add", "implement", "new", "feature"]
    
  bugfixes:
    count: N
    commits: [...]
    keywords: ["fix", "bug", "issue", "resolve", "patch"]
    
  refactoring:
    count: N
    commits: [...]
    keywords: ["refactor", "clean", "reorganize", "improve"]
    
  documentation:
    count: N
    commits: [...]
    keywords: ["doc", "readme", "comment", "typo"]
    
  dependencies:
    count: N
    commits: [...]
    keywords: ["upgrade", "update", "dependency", "bump"]
    
  infrastructure:
    count: N
    commits: [...]
    keywords: ["ci", "cd", "docker", "deploy", "build"]
```

### 5. Build Business Context Summary
Synthesize a narrative from extracted data:

```yaml
context_summary:
  target: string
  
  business_purpose:
    inferred_from: "commit_messages|jira|both"
    summary: |
      This service handles user authentication using OAuth2.
      Key features include token refresh, SSO integration, and 
      rate limiting. Primary use cases derived from JIRA:
      - User login/logout flows
      - API token management
      - Session validation
      
  key_themes:
    - "OAuth2 implementation"
    - "Security hardening"
    - "Performance optimization"
    
  recent_focus:
    - "Token refresh reliability (last 30 days)"
    - "Rate limiting (last 60 days)"
    
  stakeholders:
    primary_contributors:
      - name: "John Doe"
        expertise: ["auth", "security"]
        commit_percentage: 45%
    review_contacts:
      - name: "Jane Smith"
        last_active: ISO8601
        
  health_indicators:
    commit_velocity: high|medium|low
    bus_factor: N  # number of active contributors
    documentation_ratio: N%  # doc commits / total
```

### 6. Identify Technical Debt Signals
From commit history, detect debt indicators:

```yaml
debt_signals:
  - type: "repeated_fixes"
    description: "Multiple fixes to same component"
    evidence: ["fix auth retry", "fix auth retry again", ...]
    severity: medium
    
  - type: "todo_commits"
    description: "TODO/FIXME markers added"
    evidence: [commit list]
    severity: low
    
  - type: "revert_frequency"
    description: "Commits being reverted"
    evidence: [revert commits]
    severity: high
```

### 7. Store Context in Scout Sidecar
Update `_memory/scout-sidecar/scout-discoveries.md`:

```yaml
discovered_targets:
  - path: string
    discovery_timestamp: ISO8601
    phase: context_extracted
    
jira_keys_found:
  - key: string
    target: string
    first_seen: ISO8601
```

Create per-target context file:
**File:** `_memory/scout-sidecar/context/{target_name}.yaml`
```yaml
target: string
extracted_at: ISO8601
git_context: {...}
issue_references: {...}
jira_context: {...}
context_summary: {...}
```

## Edge Cases and Failure Modes

| Condition | Action |
|-----------|--------|
| No git history (new repo) | WARN: "No commit history. Limited context available." |
| No JIRA references found | INFO: "No issue references. Using commit messages only." |
| JIRA rate limited | WARN, pause and retry, or continue without |
| >1000 commits in history | Sample recent + milestones (tags) |
| Binary files in commit messages | Skip binary-related commits |
| Non-ASCII characters | Handle encoding gracefully |
| Git repo is shallow clone | WARN: "Limited history. Consider full clone." |

## Output
```yaml
context_summary:
  target: string
  extracted_at: ISO8601
  
  git_context:
    total_commits: N
    contributors: N
    activity_trend: string
    
  issue_references:
    jira_keys: N
    github_issues: N
    
  jira_context:
    status: available|unavailable
    issues_enriched: N
    
  business_purpose:
    summary: string
    key_themes: [list]
    
  stakeholders:
    primary_contributors: [list]
    
  debt_signals: [list]
  
  confidence_score: 0.0-1.0  # based on data richness
```
