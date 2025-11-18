# TIMELINE_DEBUG_TODOS

// TODO (fix)timeline_search_filter

- unable to filter for content within the timelineView rows
- Timeline search unable to search by files touched using a path i.e., src/api/route.ts should show all the events where this file was mentioned.

## timeline row cards

- flip with a click (two-sided cards) user/assistant
    - flip to see users closest response to the assistants latest message or vice-versa
    - works on any filter types
<[electric-card for users side](https://reactbits.dev/animations/electric-border)>

---

### bounce cards for multi-view

- use bounce cards to show muliple types at once
- configurable by its own filters using the same types

<[bounce cards](https://reactbits.dev/components/bounce-cards)>

---

## Commands view

- (extra) dedicated section for the commands ran for the session
- global search filter
- clickthrough to jump to point in timeline when command was ran

## sort filters

- sort list asc/dsc order toggle
- jump to latest button
- export single or selected filters applied
- user messages added to header
- dual pane view side by side viewing of user/assistant
- card flipping to reveal user/assistant info or metadata attached

---
