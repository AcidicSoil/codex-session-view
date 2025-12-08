# TODOS

---

## LATEST ADDED COMPONENTS IN FIRST BLOCK

### not-sorted or verified (check-components being used currently and prune list)

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

## WHEN APPLY_PATCH TRANSFORMATIONS GET IMPLEMENTED

- use this component for the animation when clicked on and then the rendering loading animation will begin

[use for apply_patch transformations effect](https://www.scrollxui.dev/docs/components/modern-loader)

// TODO

## USE THIS NAVBAR FLOW

- fix sticky navbar heading issue first then implement this in addition

[use this as option to hide navbar ](https://www.scrollxui.dev/docs/components/navbar-flow)

// TODO

## SETUP PAGINATION FOR SESSION-EXPLORER VIEW

- implement pagination for session explorer viewer to save screen space and make navigation easier

[pagination component](https://www.scrollxui.dev/docs/components/pagination)

// TODO

## ADD SPLITTER COMPONENT TO RULE INSPECTOR SHEET

[RULE INSPECTOR SHEET](https://www.scrollxui.dev/docs/components/splitter)

// TODO

## BATCH SEARCH FILTER `ADD TO CHAT` FUNCTION

- implement a batched search filter `ADD TO CHAT` function for sending matching patterns to chat as chatbot context.

- chatbot would gain access to these as an additional reservior of context/data to look/read during conversations/usage

- COMPONENT for signifying added events (brainstorm to improve before implementing this TODO)

// TODO

## TIMELINE SEARCH FILTER IMPROVEMENTS

- show index of current match and so forth as each key press iterates through all matching patterns

- currently will show a static number of matches on each key press the number does not change

---

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

### timeline todo

- fix the filters to persist so it doesnt reset each time view is changed

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

- clicking on timeline prop will trigger [this effect](https://ui.aceternity.com/components/expandable-card) allowing full size view of prop

apply_patch transformation (optional) animation (when the pop-out effect from [this effect](https://ui.aceternity.com/components/expandable-card) is fully expanded [then this animation triggers](https://animate-ui.com/docs/components/animate/code))

- able to turn of in settings menu
- if on, then when a timeline prop that is clicked on by user opens then this animation will trigger
- [animation](https://animate-ui.com/docs/components/animate/code)
- parses the event prop and reconstruct the underlying source file exactly as it should exist on disk, without any surrounding shell or patch syntax.

---

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

## gemini-cli-ai-sdk

```tsx example.tsx
import { generateText } from 'ai';
import { createGeminiProvider } from 'ai-sdk-provider-gemini-cli';

// Create provider with OAuth authentication
const gemini = createGeminiProvider({
  authType: 'oauth-personal',
});

const result = await generateText({
  model: gemini('gemini-3-pro-preview'),
  prompt: 'Write a haiku about coding',
});

console.log(result.content[0].text);

```

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

---

[for loading screens like in the sidebar for generating commits and summaries](https://www.diceui.com/docs/components/circular-progress)

[data table for rule violations](https://www.diceui.com/docs/components/data-table)

[replace current badges with badge groups](https://www.diceui.com/docs/components/badge-overflow)

[sessions with multiple repos will show with avatar group](https://www.diceui.com/docs/components/badge-overflow)
