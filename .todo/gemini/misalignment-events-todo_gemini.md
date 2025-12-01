# **Code Review: Chatbot & Misalignment Components**

## **1\. Misalignment Events Not Rendering (Reactivity Issue)**

Issue: Misalignment events do not appear until the page is refreshed.
Root Cause:

* The misalignment analysis likely happens asynchronously (e.g., via src/routes/api/chatbot/analyze.ts), but the frontend state isn't automatically updated when this process completes.
* If you are using TanStack Query (React Query) or a similar fetcher, the queryKey responsible for fetching misalignments is likely not being invalidated or refetched after the "Session Analysis" completes.
* **File to check:** src/features/chatbot/chatbot.runtime.ts or the component triggering the analysis. Ensure a callback invalidates the relevant data source.

## **2\. Rendering All Agents (Over-Rendering)**

Issue: The banner renders all parsed agents instead of just violations.
Root Cause:

* In src/components/chatbot/MisalignmentBanner.tsx (or the parent passing props), the code likely iterates over the full list of agents or rules loaded from AGENTS.md without filtering for those that have actively triggered a violation in the current session.
* **Fix:** The misalignments prop passed to the banner should be filtered.
  // conceptual fix
  const activeViolations \= allRules.filter(rule \=\>
    analysisResult.violations.includes(rule.id)
  );

## **3\. Non-Functional Buttons**

Issue: Open, Acknowledge, and Dismiss buttons are cosmetic.
Root Cause:

* Confirmed in src/components/chatbot/MisalignmentBanner.tsx. The onClick handlers currently utilize simple console.log statements or empty functions.
* **Fix:** These need to be wired to:
  * **Open:** Expand the specific rule details or navigate to the exact line in the session viewer.
  * **Acknowledge:** Send a mutation to the backend to mark this misalignment as "seen" (persisted in src/server/persistence/misalignments.ts).
  * **Dismiss:** Remove it from the current view state (local state update).

## **4\. Verification Logic (False Positives)**

Issue: Rendering rules that weren't actually violated.
Root Cause:

* The current logic likely conflates "monitoring a rule" with "violating a rule".
* The analyze endpoint (src/routes/api/chatbot/analyze.ts) needs to implement a stricter comparator. It should take the *Session Events* and compare them against the *Agent Instructions*.
* If the LLM output (the chatbot) is doing the checking, the prompt needs to be tuned to output strictly formatted violations (e.g., JSON) that can be parsed programmatically, rather than just text that might be misinterpreted as a violation.

## **5\. Duplicate Events & Tallies**

Issue: Multiple events for the same rule violation render as separate cards.
Root Cause:

* The rendering loop maps every event instance to a component.
* **Fix:** Group events by ruleId before rendering.
  const grouped \= misalignments.reduce((acc, curr) \=\> {
    acc\[curr.ruleId\] \= (acc\[curr.ruleId\] || 0\) \+ 1;
    return acc;
  }, {});
  // Render based on Object.keys(grouped) and show count

## **6\. Unstructured Chatbot Output**

Issue: Output is clumped/hard to read.
Root Cause:

* src/components/chatbot/ChatDockPanel.tsx (or the message renderer) is likely rendering raw text or missing typography classes.
* **Fix:** Ensure the message content is wrapped in a Markdown parser (like react-markdown) and that a typography plugin (like Tailwind's prose class) is applied to the container to handle spacing, lists, and headers correctly.
