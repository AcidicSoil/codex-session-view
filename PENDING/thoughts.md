# scratchpad thoughts after implementation

## core issues

- add another route view for chatdock or analysis view
- a picker to add which agents and rules from those agents so that not every small rule is parsed into the hookify engine
- optional agent parsing option
- add button to the hook gate that jumps to the events that violated that rule.
- suggestion improvement in chatdock (currently does nothing)
- add a different background theme to the props in the timeline that violating rules

---

12/03/25

## latest adds

- Make the button "jump to event" trigger the "load session" if it wasnt loaded prior to user triggering the "add to chat" button, which triggers the hook gate ui to appear.

In addition, also

- would like the content to be prettified somehow so it doesn't look so clumped together and clustered/unstructured.
- When clicking on the card it should flip over revealing any data that's also relevant to this event i.e., "jump to event" button(2x) both sides, user/assistant messages, (use an expanding motion card component that expands when clicked, which allows more room to display both. (scrollable if needed etc... best practices))
- backend logic to persist filters and sessions on refresh
- bookmark/saving sessions, events, chats, and other useful components storing data.
- currently "review rules" button does nothing from what I can tell. The Hook Gate / rule inspector just disappears until a user clicks add to chat again. Which in reality it should open up another route or component that is suitable for reviewing large amounts of rules.
- Also need a rule picker when everything is wired up and working properly

---

REFACTORED/REVISED

- Make the button "jump to event" trigger the "load session" if it wasnt loaded prior to user triggering the "add to chat" button, which triggers the hook gate ui to appear.

In addition, also

- would like the content to be prettified somehow so it doesn't look so clumped together and clustered/unstructured. (This goes for all components parsing text to render as output for users on the client side)
- When clicking on the card it should flip over revealing any data that's also relevant to this event i.e., "jump to event" button(2x) both sides, user/assistant messages, (use an expanding motion card component that expands when clicked, which allows more room to display both. (scrollable if needed etc... best practices))
- backend logic to persist configs on reset(if logged in as auth user, else reset to default is fine), else if authorized user with login etc... then persistence on refresh i.e., filters, sessions,  Hook Gate / rule inspector, and other components the user interacted with.
- bookmark/saving sessions, events, chats, and other useful components storing data.
- currently "review rules" button does nothing from what I can tell. The Hook Gate / rule inspector just disappears until a user clicks add to chat again. Which in reality it should open up another route or component that is suitable for reviewing large amounts of rules.
