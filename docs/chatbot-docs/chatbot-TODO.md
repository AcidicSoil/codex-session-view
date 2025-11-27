# chatbot components and fixes

## agent-parsing-improvements 

- retrieve agents.md and other provider instruction files from users code base
- currently the first agents.md is seen at the start of every session, but there is no proof of nested agents.md being parsed yet.
- need to gather all at root and nested to fully flesh out the alignment feature/functions properly.

## chatbot components and fixes

---

## clearing chat thread/new chat

---

## other fixes while adding these components

- fix chat input so user can hit enter or ctrl + enter to send chat to assistant

- finish wiring in providers for full functionality

---

### chat dock input

[chatbot output will use this effect when chatting with users](https://ui.aceternity.com/components/encrypted-text)

[after user hits send, this effect will trigger to show effect of text leaving the input area and into the conversation history](https://ui.aceternity.com/components/placeholders-and-vanish-input)

---

## evidence

[for the flagged files not following instruction files](https://ai-sdk.dev/elements/components/sources)

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
