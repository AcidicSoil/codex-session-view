# TODOS

---

## LATEST ADDED COMPONENTS

### semi-sorted but not verified (check-components being used currently and prune list)

---

// TODO (not-started)

- Create a MCP tool for ai agents to fetch timeline events for quick context gathering
  - this would help when using different providers for ai agents (i.e., gemini-cli and codex)
    - this could allow more accurate context ingesting so they are both on the same page of work and state of progress.
- Example of this would be when we use the export function for timeline, which would show a structured timeline of a session based on choice of export. See timeline exports and export for an example for structure.
- Turning this idea into a tool that any ai agent/assistant can call will give them essential context into the users workflow/code base for a more accurate experience. 

---

## timeline filters and commands filters

- add another view for showing the skills/commands used in the session and which order they ran. (duplicated removed as an option for)

// TODO (not-started)

- Add native gemini-cli commands to timeline filters
  - currently the commands filters has native codex filters

// TODO (not-started)

- export picker for selecting itemized exports
  - provide the capability of exporting i.e., assistant messages and tool calls and/or user messages etc...

// TODO (not-started)

- Add filters for skills,prompts(codex) and commands(gemini-cli) aka prompts but native for gemini-cli

---

// TODO (not-started)

- [replace existing ](https://magicui.design/docs/components/dock)

---

// TODO (not-started)

### Action Bar (Future Feature)

- [action-bar for future feature](https://www.diceui.com/docs/components/action-bar)

this would send the necessary commands to the configured cli agents to perform actions. Could be set on time intervals when they would run or could be instant.

---

// TODO (not-started)

### Add a summarize session button for inferencing on the current session

- 'summarize session' button to the timeline and/or the session explorer (similar to the 'add to chat' button)
- summarize range of timeline events (e.g. selected events)

- [short-summary-card](https://animate-ui.com/docs/components/base/preview-card) (for timeline events)

- [undecided which popover effect](https://www.kibo-ui.com/components/glimpse)

- [session-summary-timeline](https://www.diceui.com/docs/components/timeline) short summaries of sessions displayed using the timeline component (NOTE: this is different the already existing timeline viewer component)

---

// TODO (not-started)

### regarding session-explorer search input filter

- would be nice to have the ability to search for matching patterns within the sessions w/o loading each one individually

---

// TODO (not-started)

## Analysis route view (for a more in-depth analysis of sessions)

[column-dimensions](https://mui.com/x/react-data-grid/column-dimensions)

- auto-resizable table columns

[gantt](https://www.kibo-ui.com/components/gantt)

- not sure yet where to use, maybe another analysis route added later and use there

---

// TODO (not-started)

[editor](https://www.kibo-ui.com/components/editor)

- editor for notes if needed

---

// TODO (not-started)

[status](https://www.kibo-ui.com/components/status)

- status badges for timeline events per provider (e.g. gemini, codex, etc...)

- might also use for timeline events for signifying rules violated

---

// TODO (not-started)

[tree](https://www.kibo-ui.com/components/tree)

- show src code tree view with changes rendered in sessions (similar to git diff tree)

---

// TODO (not-started)

[animated-badge](https://www.eldoraui.site/docs/components/animated-badge)

[animated-shiny-button](https://www.eldoraui.site/docs/components/animated-shiny-button)

---

// TODO (not-started)

[text](https://www.hextaui.com/blocks/ai-prompt-templates)

[text](https://www.hextaui.com/blocks/ai-streaming-response)

[text](https://www.hextaui.com/blocks/ai-prompt-input)

[text](https://www.hextaui.com/blocks/ai-suggested-prompts)

[text](https://www.hextaui.com/blocks/ai-message)

[text](https://www.hextaui.com/blocks/ai-citations)

[for rule violations detected](https://www.hextaui.com/blocks/settings-notifications)

- toggle on/off

[text](https://www.hextaui.com/blocks/team-prompt-library)

[text](https://www.hextaui.com/blocks/team-projects)

[text](https://www.hextaui.com/blocks/team-notes)

---


[hollow-circle?](https://www.cult-ui.com/docs/components/shader-lens-blur)
// TODO (IN-PROGRESS/DONE)

- [chat-history](https://www.ui-layouts.com/components/motion-drawer)

// TODO

[card](https://www.cult-ui.com/docs/components/expandable)

[screen](https://www.cult-ui.com/docs/components/expandable-screen)

---

// TODO (refactors-todo) ai panel search components

[search](https://sitesearch.algolia.com/docs/experiences/search)

[search-askai](https://sitesearch.algolia.com/docs/experiences/search-askai)

[dropdown-search](https://sitesearch.algolia.com/docs/experiences/dropdown-search)

[highlight-to-askai](https://sitesearch.algolia.com/docs/experiences/ask-ai/highlight-to-askai)

[sidepanel-askai](https://sitesearch.algolia.com/docs/experiences/ask-ai/sidepanel-askai)

---

// TODO (in-progress)

[file-upload_replacement](https://reui.io/docs/file-upload)

// TODO

## WHEN APPLY_PATCH TRANSFORMATIONS GET IMPLEMENTED

- use this component for the animation when clicked on and then the rendering loading animation will begin

[use for apply_patch transformations effect](https://www.scrollxui.dev/docs/components/modern-loader)

---

## file changes

### will add this

- detect file changes and collect a count
- use apply_patch and other file changing tools to classify as a file change
- create a parser for apply_patch calls that transform the files normalized w/o the shell syntax etc...

### notes

[will be used in timeline props to send to file changed, which will be parsed apply_patch etc...](https://ui.aceternity.com/components/3d-pin)

---

### timeline props expand (use the pop-out motion/animation on initial click)

apply_patch transformation (optional) animation (when the pop-out effect from [this effect](https://ui.aceternity.com/components/expandable-card) is fully expanded [then this animation triggers](https://animate-ui.com/docs/components/animate/code))

- able to turn of in settings menu
- if on, then when a timeline prop that is clicked on by user opens then this animation will trigger
- [animation](https://animate-ui.com/docs/components/animate/code)
- parses the event prop and reconstruct the underlying source file exactly as it should exist on disk, without any surrounding shell or patch syntax.

---

// TODO

## BATCH SEARCH FILTER `ADD TO CHAT` FUNCTION (feat/chatbot-concise-context_tool-usage)

- implement a batched search filter `ADD TO CHAT` function for sending matching patterns to chat as chatbot context.

- chatbot would gain access to these as an additional reservior of context/data to look/read during conversations/usage

- COMPONENT for signifying added events (brainstorm to improve before implementing this TODO)


// TODO

## USE THIS NAVBAR FLOW

- fix sticky navbar heading issue first then implement this in addition

[use this as option to hide navbar](https://www.scrollxui.dev/docs/components/navbar-flow)

## **HOT**

// TODO

[command-filters combobox](https://taki-ui.com/docs/components/combobox)

// TODO

[new-header](https://www.ui-layouts.com/components/responsive-header)

- filter tools by command types (sed, rg, git, apply_patch, etc...)

- timeline prop event cards should show badges of file names and/or command names

// TODO

## OTHER-BUTTONS

[MORE-BUTTONS](https://oui.mw10013.workers.dev/button)

// TODO

## DISCUSSION VIEW

[USER-ASSISTANT-DISCUSSION-VIEW-OPTIONS](https://www.moleculeui.design/docs/components/discussion)

- infer and wrap user/assistant conversations based on smart inferencing/grouping of session events

// TODO

## ADD SHIMMER LAYER TO ALL BUTTONS

[SHIMMER-LAYER-TO-ALL-BUTTONS](https://ui.phucbm.com/components/shimmer-layer)

---

// TODO (in-progess/done)

## ADD BADGES TO TOOL PROPS(TIMELINE-EVENTS)

PURPOSE: This allows users to scan through timeline without clicking into each timeline prop individually, speeds up users workflow

- adding badges to signify what exact command was ran

[MORE-BADGES](https://ui.spectrumhq.in/docs/status-badge)
[BADGE-OPTION](https://oui.mw10013.workers.dev/badge)

[MORE-BADGES](https://www.diceui.com/docs/components/badge-overflow)

---

// TODO (DONE)

## EXPORT-OPTIONS

- add buttons for exporting filtered timeline options
[use-this-style-for-export-buttons](https://www.scrollxui.dev/docs/components/animated-button)

// TODO

## TOKEN-USAGE ANALYZER ROUTE

- Implement new route for analyzing sessions through charts & graphs
- The route will contain

[range-calendar](https://intentui.com/docs/components/date-and-time/range-calendar)

- [another-calendar-functional-view-option_for_users](https://intentui.com/docs/components/date-and-time/date-range-picker)

[token-usage_per_feature-implemented](https://intentui.com/docs/components/visualizations/area-chart)

[more-view-options-for-user](https://intentui.com/docs/components/visualizations/tracker)

[more-chart-view-options-for-user](https://intentui.com/docs/components/visualizations/pie-chart)

[progress-of-feature_until_fully-implemented](https://smoothui.dev/docs/components/animated-progress-bar)

---

### **similar to this but not quite the same look**

[Modern task management dashboard with statistics, charts, and kanban board.](https://github.com/ln-dev7/square-ui/tree/master/templates/tasks)

---

// TODO

## CONTRIBUTION-GRAPH (NOT SURE WHERE TO IMPLEMENT YET)

- contribution-graph
[contribution-graph](https://smoothui.dev/docs/components/contribution-graph)

// TODO

## SMOOTHER RELOADS OF REAL-TIME UPDATES OF ACTIVE SESSIONS

- currently, the reloading is a kin to a violent rapid refresh.

// TODO

## IMPROVED UI I/O CHATBOT INTERACTIONS

- improve loading/thinking bubble for the chatbot while thinking, currently the element is a static ellipsis (add a motion animation)
- improve the animation for users after the 'send' in the chatdock has been been triggered. Currently, has a blue fading animation effect. (see session-explorer_TODO.md for any components that can be used as replacements to the current implementation)

// TODO

## ADD TOOL USAGE TO CHATBOT

- add tools for the chatbot to call to improve context gathering
- verify what context the chatbot is injected with at initialization when the 'add to chat' button event has been triggered by the user

// TODO

## ADD SVG LOGOS FOR BADGES TO README

- Use each tool’s own logo files and follow any brand/usage notes in their docs.

[GEMINI](https://svgl.app/?utm_source=ui.shadcn.com&utm_medium=referral&utm_campaign=directory&search=gemini+)

LMSTUDIO

CODEX

// TODO

## SCROLL EFFECTS

[SCROLL-ANIMATION](https://www.ui-layouts.com/components/scroll-animation)

[STICKY-SCROLL](https://www.ui-layouts.com/components/sticky-scroll)

// TODO

## RICH-POPOVER ANIMATION COMPONENT EFFECT

- for rule volations or adherence in event timeline prop cards

[use in timeline events with rules as pop-in function](https://smoothui.dev/docs/components/rich-popover)

// TODO

## REFACTOR CURRENT CODE-BLOCK COMPONENT

[replace and extend code-block](https://www.scrollxui.dev/docs/components/codeblock)

// TODO

## SETUP PAGINATION FOR SESSION-EXPLORER VIEW

- implement pagination for session explorer viewer to save screen space and make navigation easier

[pagination component](https://www.scrollxui.dev/docs/components/pagination)

// TODO

## ADD SPLITTER COMPONENT TO RULE INSPECTOR SHEET

[RULE INSPECTOR SHEET](https://www.scrollxui.dev/docs/components/splitter)

## You asked

what are options for dynamically running llm inference on the parser results before final results are shown. Giving it a prompt in addition to the parsing heuristics already in place. This could help with filtering out duplicates and sorting etc... for instruction files? `https://github.com/AcidicSoil/codex-session-view`

## 1 session explorer and timeline backgrounds

[timeline](https://ui.aceternity.com/components/dotted-glow-background)

[session explorer](https://ui.aceternity.com/components/meteors)

---

## user/assistant-messages-on-hover

- for timeline view props
- it will show the user message if the prop is an assistant message and vice versa

[effect to use on user/assistant messages](https://ui.aceternity.com/components/evervault-card)

---

## TIMELINE TODOS

## MULTISELECTOR COMPONENTS

[replace current filters in session explorer](https://www.ui-layouts.com/components/multi-selector)

[tag for filters](https://www.ui-layouts.com/components/tags-input)

[text](https://www.ui-layouts.com/components/datetime-picker)

[text](https://www.ui-layouts.com/components/buy-me-coffee)

[text](https://www.ui-layouts.com/components/footers)

[Hook-Gate_rule-inspector](https://www.ui-layouts.com/components/accordion)

[background effect](https://cursify.vercel.app/components/neural-glow)

[](https://systaliko-ui.vercel.app/docs/blocks/header)

[filter buttons](https://systaliko-ui.vercel.app/docs/ecommerce/toggle-layout)

[start of scroll animation for session explorer](https://systaliko-ui.vercel.app/docs/blocks/scroll-animations-rotate)

## CHATBOT TODOS

### misalignment events

- misalignment events do not render until page is refreshed
- when misalignment events render they render all of the parsed agents instead of objectively choosing the misalignment events that were truly misaligned events.
- `open`, `acknowledge`, and `dismiss` buttons on the misalignment events do not currently do anything aside from toggling to show they are pressed.
- find a way to only have true misalignment events render when a session is added to chat instead of it rendering every agents.md rule that is parsed directly without properly checking the session first to verify that rule was actually violated before it renders as an misalignment event.

What changes are needed to get this behavior for our misalignment events and other areas of our codex-session-viewer app?

 [similar idea I want for the misalignment events](https://github.com/anthropics/claude-code/tree/main/plugins/hookify)
`https://github.com/anthropics/claude-code/blob/main/plugins/hookify/agents/conversation-analyzer.md`

Improve Prompt

---

## artifacts

[artifacts](https://www.assistant-ui.com/examples/artifacts)

## agent-parsing-improvements

- retrieve agents.md and other provider instruction files from users code base
- currently the first agents.md is seen at the start of every session, but there is no proof of nested agents.md being parsed yet.
- need to gather all at root and nested to fully flesh out the alignment feature/functions properly.

## chatbot components and fixes

---

## clearing chat thread/new chat

---

## other fixes while adding these components

- fix chat input so user can hit enter or ctrl + enter to send chat to assistant (done)

- finish wiring in providers for full functionality (partial)

---

### chat dock input

[chatbot output will use this effect when chatting with users](https://ui.aceternity.com/components/encrypted-text) (not-done)

[after user hits send, this effect will trigger to show effect of text leaving the input area and into the conversation history](https://ui.aceternity.com/components/placeholders-and-vanish-input)

---

## evidence

- add embedding model for large sessions and/or multiple sessions before next stage of chatbot (i.e., output response)

[for the flagged files not following instruction files](https://ai-sdk.dev/elements/components/sources)

show evidence in chat

## model selector

[Prompt Input](https://ai-sdk.dev/elements/components/prompt-input)

[model selector](https://ai-sdk.dev/elements/components/model-selector)

[Message](https://ai-sdk.dev/elements/components/message)

[Inline Citation](https://ai-sdk.dev/elements/components/inline-citation)

[conversation](https://ai-sdk.dev/elements/components/conversation)

[Checkpoint](https://ai-sdk.dev/elements/components/checkpoint)

[Chain of Thought](https://ai-sdk.dev/elements/components/chain-of-thought)

[Reasoning](https://ai-sdk.dev/elements/components/reasoning)

[Suggestion](https://ai-sdk.dev/elements/components/suggestion)

[Task](https://ai-sdk.dev/elements/components/task)

[Tool](https://ai-sdk.dev/elements/components/tool)

[Artifact](https://ai-sdk.dev/elements/components/code-block)

---

## GENERAL TODOS

[add to background behind all](https://ui.aceternity.com/components/vortex)

### bookmarking

- capable of bookmarking props and/or sessions
- capable of dragging props to bookmark and/or hitting a bookmark [toast]
[draggable motion effect to be used](https://ui.aceternity.com/components/draggable-card)

- capable of naming bookmarks and/or autogenerate names based on its contents using integrated llm chatbot w/ provider

---

# chatbot-logic_enhancements_todo

[docs](https://www.assistant-ui.com/docs/)

[ai-chat-history](https://www.hextaui.com/blocks/ai-chat-history)

[Chat History for AI SDK](https://www.assistant-ui.com/docs/cloud/persistence/ai-sdk)

[api-reference](https://www.assistant-ui.com/docs/api-reference/overview)

[text](https://www.assistant-ui.com/examples)

[enhancement_todo](https://www.assistant-ui.com/docs/guides/Branching)

[text](https://www.assistant-ui.com/docs/copilots/make-assistant-tool)

[text](https://www.assistant-ui.com/docs/copilots/motivation)

[text](https://www.assistant-ui.com/docs/copilots/use-assistant-instructions)

[attach events that qualify as rule breaking violations to agent/repo rules](https://www.assistant-ui.com/docs/copilots/model-context)

[text](https://www.assistant-ui.com/docs/copilots/assistant-frame)

[text](https://www.assistant-ui.com/docs/runtimes/assistant-transport)

---

[text](https://ai-sdk.dev/elements/components/sources)

---

[text](https://ui.aceternity.com/components/encrypted-text)

---

[many other nice components to consider](https://www.cult-ui.com/docs/components/logo-carousel)

[main header](https://www.cult-ui.com/docs/components/text-gif)

[text-CVS_xl_GIF-4_BOLD](https://www.cult-ui.com/docs/components/text-gif)

---

[for loading screens like in the sidebar for generating commits and summaries](https://www.diceui.com/docs/components/circular-progress)

[data table for rule violations](https://www.diceui.com/docs/components/data-table)

[replace current badges with badge groups](https://www.diceui.com/docs/components/badge-overflow)

[sessions with multiple repos will show with avatar group](https://www.diceui.com/docs/components/badge-overflow)
