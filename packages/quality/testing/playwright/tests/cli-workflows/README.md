# Workflow Testing Framework

## Introduction

This framework tests pong's nodes and workflows to:

* ✅ **Ensure Correctness:** Verify that nodes operate correctly
* 🔄 **Maintain Compatibility:** Detect breaking changes in external APIs
* 🔒 **Guarantee Stability:** Prevent regressions in new releases

## Our Move to Playwright

This framework is an evolution of a previous system. We moved to **Playwright** as our test runner to leverage its powerful, industry-standard features, resulting in:

* **Simpler Commands:** A single command to run tests, with simple flags for control
* **Better Reporting:** Rich, interactive HTML reports with visual diffs
* **Built-in Features:** Automatic retries, parallel execution, and CI integration out of the box
* **Schema Validation:** Detect structural changes that indicate API breaking changes

---

## 🚀 Quick Start

### Prerequisites

1. **Set encryption key:** The test credentials are encrypted. Add to `~/.pong/config`:
   ```json
   {
     "PONG_ENCRYPTION_KEY": "YOUR_KEY_FROM_BITWARDEN"
   }
   ```
   Find the key in Bitwarden under "Testing Framework encryption key"

2. **Fresh database (optional):** For a clean start, remove `~/.pong/database.sqlite` if it exists
3. **Setup Environment**: ```pnpm test:workflows:setup```

### Basic Commands

```bash
# 1. Basic execution test (just verify workflows run without errors)
pnpm test:workflows

# 2. Run with schema validation
SCHEMA=true pnpm test:workflows

# 3. Update schema snapshots (when output structure changes)
pnpm test:workflows --update-snapshots

# 4. Run specific workflows (using grep)
pnpm test:workflows -g "email"
```

### View Test Results

After any test run, open the interactive HTML report:
```bash
npx playwright show-report
```

The report shows:
* ✅ Passed/❌ Failed tests with execution times
* 📸 Schema diffs showing structural changes
* ⚠️ Warnings and annotations
* 📊 Test trends over time (in CI)

---

## ⚙️ How It Works

### Test Modes

1. **Basic Run** (default): Executes workflows and checks for errors
2. **Schema Mode** (`SCHEMA=true`): Validates workflow output structure against saved schemas

### Schema Validation (Recommended)

Schema validation captures the **structure** of workflow outputs, not the values. This is ideal for:
- Detecting API breaking changes (field renames, type changes)
- Avoiding false positives from legitimate data variations
- Maintaining stable tests across different environments

When enabled, the framework:
1. Generates a JSON schema from the workflow output
2. Compares it against the saved schema snapshot
3. Reports any structural differences

**Example of what schema validation catches:**
```javascript
// Original API response
{ user: { name: "John", email: "john@example.com" } }

// Changed API response (field renamed)
{ user: { fullName: "John", email: "john@example.com" } }
// ❌ Schema validation catches this immediately!
```

### Why Schema Over Value Comparison?

Traditional value comparison often leads to:
- 🔴 False positives from timestamps, IDs, and other dynamic data
- 🔴 Constant snapshot updates for legitimate data changes
- 🔴 Missing actual breaking changes when values happen to match

Schema validation focuses on what matters:
- ✅ Data structure and types
- ✅ Field presence and naming
- ✅ API contract stability

---

## 📋 Configuration

### workflowConfig.json

Controls workflow execution and testing behavior:

```json
[
  {
    "workflowId": "123",
    "status": "ACTIVE",
    "enableSchemaValidation": true
  },
  {
    "workflowId": "456",
    "status": "SKIPPED",
    "skipReason": "Depends on external API that is currently down",
    "ticketReference": "JIRA-123"
  }
]
```

**Configuration Fields:**
- `workflowId`: The ID of the workflow (must match the filename)
- `status`: Either "ACTIVE" or "SKIPPED"
- `enableSchemaValidation`: (optional) Whether to use schema validation (default: true)
- `skipReason`: (optional) Why the workflow is skipped
- `ticketReference`: (optional) Related ticket for tracking

---

## 🎯 Workflow for New Tests

### Step-by-Step Process

```bash
# 1. Create/modify workflow in pong UI
# 2. Export the workflow
./packages/cli/bin/pong export:workflow --separate --output=test-workflows/workflows --pretty --id=XXX

# 3. Add configuration entry to workflowConfig.json
# Edit workflowConfig.json and add:
{
  "workflowId": "XXX",
  "status": "ACTIVE",
  "enableSchemaValidation": true
}

# 4. Test basic execution
pnpm test:workflows -g "XXX"

# 5. Create initial schema snapshot
SCHEMA=true pnpm test:workflows --update-snapshots -g "XXX"

# 6. Verify schema validation works
SCHEMA=true pnpm test:workflows -g "XXX"

# 7. Commit all changes
git add test-workflows/workflows/XXX.json
git add __snapshots__/workflow-XXX-schema.snap
git add workflowConfig.json
```

---

## 💡 Common Scenarios

### "I just want to check if workflows run"
```bash
pnpm test:workflows
```

### "I want to ensure API compatibility"
```bash
SCHEMA=true pnpm test:workflows
```

### "An API legitimately changed its structure"
```bash
# Update the schema snapshot
pnpm test:workflows --update-snapshots -g "workflow-name"
# Note: --update-snapshots automatically enables schema mode
```

### "I want to skip a workflow temporarily"
Update `workflowConfig.json`:
```json
{
  "workflowId": "123",
  "status": "SKIPPED",
  "skipReason": "API endpoint is under maintenance",
  "ticketReference": "SUPPORT-456"
}
```

---

## 🔧 Creating Test Workflows

### Best Practices

1. **One node per workflow:** Test a single node with multiple operations/resources
2. **Use test files:** Reference the files automatically copied to `/tmp` by setup
3. **Limit results:** Set "Limit" to 1 for "Get All" operations when possible
4. **Handle throttling:** Add wait/sleep nodes for rate-limited APIs
5. **Focus on structure:** Schema validation handles dynamic values automatically

### Available Test Files

The setup automatically copies these to `/tmp`:
- `pong-logo.png`
- `pong-screenshot.png`
- PDF test files:
  - `04-valid.pdf`
  - `05-versions-space.pdf`

### Exporting Credentials

When credentials expire or need updating:

```bash
# Update the credential in pong UI
# Export all credentials (encrypted)
./packages/cli/bin/pong export:credentials --output=test-workflows/credentials.json --all --pretty
```

⚠️ **Never use `--decrypted` when exporting credentials!**

---

## 🐛 Troubleshooting

### Tests fail with "No valid JSON output found"
The workflow likely has console.log statements. Remove them or ensure they don't interfere with JSON output.

### Schema differences for legitimate changes
When an API or node output structure legitimately changes:
```bash
pnpm test:workflows --update-snapshots -g "affected-workflow"
```

### Setup didn't run / Need to re-run setup
```bash
pnpm test:workflows:setup
```

### Workflow not found
Ensure the workflow was exported to the `test-workflows/workflows` directory and the workflowId in `workflowConfig.json` matches the filename.

---

## 🔄 Setup Process

```bash
pnpm test:workflows:setup
```

---

## 📊 Understanding Test Output

### Test Status

- **✅ PASSED:** Workflow executed successfully (and schema matched if enabled)
- **❌ FAILED:** Workflow execution failed or schema didn't match
- **⏭️ SKIPPED:** Workflow marked as SKIPPED in configuration

### Schema Comparison

When schema validation is enabled, the test compares:
- Data types (string, number, boolean, array, object)
- Object properties and their types
- Array element types
- Overall structure depth and shape

Schema validation ignores actual values, focusing purely on structure, making tests more stable and meaningful.
