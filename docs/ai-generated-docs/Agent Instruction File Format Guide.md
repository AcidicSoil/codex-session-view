# **Agent Instruction File Format Guide**

The Session Coach and Chatbot parse .md files throughout the repository (e.g., AGENTS.md, .ruler/\*.md) to understand project-specific constraints and guidelines.

## **File Discovery**

The system automatically scans for files matching these patterns:

* \*\*/AGENTS.md
* \*\*/.ruler/\*.md
* \*\*/.cursor/rules/\*.md

## **Structure Requirements**

The parser expects standard Markdown. Each **Heading** (H1-H6) creates a distinct rule. The content immediately following the heading becomes the rule's description.

### **Basic Syntax**

\# Rule Title (Brief & Actionable)

A short summary paragraph describing the rule. This is used to match the rule against conversation context.

\- Specific requirement or constraint (bullet point)
\- Another detailed instruction
\- Exceptions to the rule

### **Severity Inference**

The system automatically assigns a severity level (High, Medium, Low, or Info) based on keywords detected in the heading or body text.

| Severity | Keywords to Use | Visual Indicator |
| :---- | :---- | :---- |
| **High** | MUST NOT, NEVER, DO NOT, CRITICAL | Red / Error |
| **Medium** | AVOID, SHOULD NOT, WARN, CAUTION | Orange / Warning |
| **Low** | PREFER, CONSIDER, OPTIONAL | Blue / Info |
| **Info** | (Default if no keywords found) | Gray |

## **Examples**

### **1\. High Severity Rule (Critical)**

Use strong negation language to flag this as a critical constraint.

\# Never Commit Secrets to Source Control

Do not hardcode API keys, passwords, or tokens in the codebase. Use environment variables.

\- Detects patterns like \`const apiKey \= "sk-..."\`
\- Applies to \`.env\` files committed to git

### **2\. Medium Severity Rule (Best Practice)**

Use "Avoid" or "Should" to denote architectural preferences.

\# Avoid useEffect for Data Fetching

Data fetching should occur in Loaders or Server Functions, not inside \`useEffect\`.

\- Prevents waterfalls
\- Ensures hydration compatibility

### **3\. Grouping Rules**

You can group related rules in a single file using multiple headings.

**File:** src/features/auth/AGENTS.md

\# Auth Pattern Guidelines

\#\# Prefer Server-Side Validation
Validation must happen in \`zod\` schemas on the server, not just client-side forms.

\#\# Avoid LocalStorage for Session Tokens
Do not store sensitive JWTs in \`localStorage\`. Use \`httpOnly\` cookies.

## **Parsing Logic Details**

1. **Headings:** Regex ^(\#{1,6})\\s+(.+)$ is used to split the file into sections.
2. **Bullets:** Lines starting with \-, \*, or \+ are extracted as specific sub-constraints.
3. **Keywords:** The parser generates search keywords from the heading and bullet points to improve retrieval relevance during chat sessions.
