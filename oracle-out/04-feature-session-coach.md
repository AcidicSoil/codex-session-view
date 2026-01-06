Direct answer (1–4 bullets, evidence-cited)

Default-enabled is explicit: isSessionCoachEnabled() returns true unless env.SESSION_COACH_ENABLED is exactly 'false'/'0'. If unset or any other value, it falls through to return true. Evidence: src/config/features.ts:isSessionCoachEnabled (return true default; explicit false/0 handling).

Flag is currently applied to all chat modes, not just “session”: getChatModeDefinition() sets enabled = featureFlags.sessionCoach.enabled() and returns that enabled for both session and general mode definitions. Evidence: src/features/chatbot/chatModeConfig.ts:getChatModeDefinition uses featureFlags.sessionCoach.enabled(); CHAT_MODE_DEFINITIONS defines both modes but does not differentiate enablement per-mode.

Operational consequence: setting SESSION_COACH_ENABLED=false (or 0) will make both session and general fail assertChatModeEnabled(), because enablement is shared. Evidence: assertChatModeEnabled() calls getChatModeDefinition(mode) and throws if !definition.enabled.

So: wiring is consistent internally, but naming/intent is questionable: the flag is named “sessionCoach” yet gates “general chat” too, which is likely not the intended semantics if “general” should remain available when “session” is disabled. Evidence: same as above; single shared enabled source for both modes.

Risks/unknowns (bullets)

Unknown whether other entry points bypass/duplicate this flag: only getChatModeDefinition/assertChatModeEnabled is shown; other API routes or UI affordances might separately gate (or forget to gate) modes, causing drift.

Misconfiguration silently enables: any non-true/1/false/0 value (e.g. 'TRUE', 'yes', empty string) results in true, which can produce environment-specific surprises.

Cannot independently control modes: with the current wiring, you can’t disable “session coach” while leaving “general chat” enabled.

Next smallest concrete experiment (1 action)

Run a single repo-wide search to enumerate all wiring points and any parallel gating:

ck --regex 'SESSION_COACH_ENABLED|isSessionCoachEnabled|featureFlags\.sessionCoach|sessionCoach' src

If evidence is insufficient, exact missing file/path pattern(s) to attach next

Env schema / typing that defines env.SESSION_COACH_ENABLED (to confirm optionality/defaults and any normalization): src/env/** (commonly src/env/server.ts or src/env/*.ts).

Any API route handlers or controllers that select/validate chat mode (to ensure this is the only gate): src/routes/**, src/server/** (especially anything invoking assertChatModeEnabled, getChatModeDefinition, or constructing mode lists for the client).

Any client/UI mode selector logic that might independently hide/show modes: src/features/**/ and src/components/** (search for “Session coach”, “General chat”, or ChatMode).
