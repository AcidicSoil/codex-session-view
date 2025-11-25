# todos

## 1

* for all search filters
  * timeline and session explorer
    * [search filter highlighting](https://magicui.design/docs/components/highlighter)

---

## component candidates

---

[session explorer and timeline scrollbar replacements](https://ui.aceternity.com/components/tracing-beam)

[replace current tooltip with this variant](https://ui.aceternity.com/components/animated-tooltip)

---

[text](https://ui.aceternity.com/components/animated-modal)

[syntax highlighted code](https://www.shadcn.io/ai/code-block?utm_source=chatgpt.com)

[code block](https://www.shadcn.io/components/code/code-block?utm_source=chatgpt.com)

? maybe
[session-explorer](https://magicui.design/docs/components/pulsating-button)

[shine-border](https://magicui.design/docs/components/shine-border)

[apply-patch props being rendered in terminal ? ](https://magicui.design/docs/components/terminal)

[user message props being rendered with typing animation ?](https://magicui.design/docs/components/typing-animation)

[search filter highlighting](https://magicui.design/docs/components/highlighter)

[render tech-stack icons for corresponding tech-stack in each repo](https://magicui.design/docs/components/icon-cloud)

[later when diffs can be compared ](https://magicui.design/docs/components/code-comparison)

[file-tree](https://magicui.design/docs/components/file-tree)

[dock for someplace TBD](https://magicui.design/docs/components/dock)

[Interactive-hover-button TBD](https://magicui.design/docs/components/interactive-hover-button)

[shimmer-button](https://magicui.design/docs/components/shimmer-button)

[session-explorer will get ported to live in this component](https://ui.shadcn.com/docs/components/sheet)

---

## 2

// TODO (finished)

* add the branch count value for each session explorer prop listed in the session explorer
* add a small badge displaying the branch amount values on the front-facing prop. Place it next to the "sessions amount" and label it "branches" and place the value in there somewhere.

---

## 3
// TODO (not-started)

session explorer button & filter group work

```md

Input (+ Input Group for the search icon), Select for “Sort by…”, Toggle Group for ASC/DESC if you keep direction separate, Button for “Filters” and “Reset”, Sheet (not Drawer) for the right-side advanced filter panel, and Badge for the active filter chips.

* Input: [https://ui.shadcn.com/docs/components/input](https://ui.shadcn.com/docs/components/input)
* Input Group: [https://ui.shadcn.com/docs/components/input-group](https://ui.shadcn.com/docs/components/input-group)
* Select: [https://ui.shadcn.com/docs/components/select](https://ui.shadcn.com/docs/components/select)
* Toggle Group: [https://ui.shadcn.com/docs/components/toggle-group](https://ui.shadcn.com/docs/components/toggle-group)
* Button: [https://ui.shadcn.com/docs/components/button](https://ui.shadcn.com/docs/components/button)
* Sheet: [https://ui.shadcn.com/docs/components/sheet](https://ui.shadcn.com/docs/components/sheet)
* Badge: [https://ui.shadcn.com/docs/components/badge](https://ui.shadcn.com/docs/components/badge)


```

---

## 4

```md

Components index: https://ui.shadcn.com/docs/components

Card:        https://ui.shadcn.com/docs/components/card
Resizable:   https://ui.shadcn.com/docs/components/resizable
ScrollArea:  https://ui.shadcn.com/docs/components/scroll-area

Input:       https://ui.shadcn.com/docs/components/input
Select:      https://ui.shadcn.com/docs/components/select
Popover:     https://ui.shadcn.com/docs/components/popover
Command:     https://ui.shadcn.com/docs/components/command
Tabs:        https://ui.shadcn.com/docs/components/tabs

Accordion:   https://ui.shadcn.com/docs/components/accordion
Collapsible: https://ui.shadcn.com/docs/components/collapsible

Badge:       https://ui.shadcn.com/docs/components/badge
Separator:   https://ui.shadcn.com/docs/components/separator


```

## 5

We are redesigning the session explorer, timeline, and chatbot experience by moving them into a unified navbar menu shell, applying a text-generate effect to all auxiliary copy outside those core views, rendering the session explorer and timeline with a sticky scroll-reveal layout, replacing the default scrollbars with a tracing-beam style visual, swapping the current tooltip implementation for an animated-tooltip variant, and hiding/revealing the session explorer and timeline behind animated tabs so the whole surface feels like a cohesive, high-signal, motion-rich workspace rather than a set of disjoint panels.

---
[add sticky navbar for navbar entries also](https://ui.aceternity.com/components/floating-navbar)

[session explorer and timeline and chatbot in navbar component](https://ui.aceternity.com/components/navbar-menu)

[this effect for all other misc text rendered in view outside of session explorer and timeline](https://ui.aceternity.com/components/text-generate-effect)

[session explorer and timeline](https://ui.aceternity.com/components/sticky-scroll-reveal)

[session explorer and timeline scrollbar replacements](https://ui.aceternity.com/components/tracing-beam)

[replace current tooltip with this variant](https://ui.aceternity.com/components/animated-tooltip)

[hide session explorer and timeline behind animated tabs](https://ui.aceternity.com/components/tabs)

* className="object-cover must be used for the demo effect"

[replace current dropzone with just this](https://intentui.com/docs/components/buttons/file-trigger)

---

### chatbot user text input effect
[chatbot output will use this effect when chatting with users](https://ui.aceternity.com/components/encrypted-text)

[after user hits send, this effect will trigger to show effect of text leaving the input area and into the conversation history](https://ui.aceternity.com/components/placeholders-and-vanish-input)

[when users text is sent from the input area to the thread it will be rendered using this effect](https://ui.aceternity.com/components/text-generate-effect)


## 6 session explorer and timeline backgrounds

[timeline](https://ui.aceternity.com/components/dotted-glow-background)

[session explorer](https://ui.aceternity.com/components/meteors)

## 7 wrap timeline props with the expandable cards

[timeline props when expanded triggers this effect](https://ui.aceternity.com/components/expandable-card)

* props keep their original look but adopt the effect of this animation when expanded.

[add sticky navbar for navbar entries](https://ui.aceternity.com/components/floating-navbar)

---

## 8
