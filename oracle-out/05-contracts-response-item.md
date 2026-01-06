Direct answer (evidence-cited)

Enumerated variants: ResponseItemSchema is a z.discriminatedUnion('type', ...) over exactly 8 literal type values: Message, Reasoning, FunctionCall, LocalShellCall, WebSearchCall, CustomToolCall, FileChange, Other. (See export const ResponseItemSchema = z.discriminatedUnion('type', [ ... ]) and each *.extend({ type: z.literal('...') }) in src/lib/session-parser/schemas.ts.)

Unknown event types are not automatically accepted: because this is a discriminated union over literal type values, any input with type: '<something else>' will fail schema validation unless it is already mapped to type: 'Other'. (OtherEventSchema only matches when type is literally 'Other'.)

Extra fields are allowed for known types: each event schema is built from BaseEvent and uses .loose(), so additional properties won’t break parsing as long as the type matches one of the 8 variants and required fields for that variant exist. (See BaseEvent ... .loose() and each ...Schema ... .loose().)

Risks/unknowns

Completeness vs. viewer: from this file alone, there’s no evidence that the viewer never receives additional event types (e.g., new tool events, errors, tracing spans). If the viewer/session log contains a new type, parsing can fail and downstream code may drop the item or error—depending on how parsing errors are handled.

Failure mode depends on parser behavior: whether “unknown types” become silent drops vs. a surfaced error depends on whether the caller uses parse vs safeParse, and whether it has a fallback mapping to 'Other'. That logic is not shown here.

Next smallest concrete experiment (1 action)

Trace how validation failures are handled: run a repo search for the schema usage and check whether unknown types are coerced/fallen back to 'Other' or rejected:

ck --regex "ResponseItemSchema|ResponseItemParsed|safeParse\\(|parse\\(" src/lib/session-parser src

If evidence is insufficient, attach missing file/path pattern(s)

src/lib/session-parser/** (the actual parse/ingest pipeline that applies ResponseItemSchema)

The viewer/timeline renderer(s), typically something like: src/**/timeline*, src/**/Timeline*, src/components/**, src/routes/** where ResponseItemParsed is consumed

Any session log emitter definitions that set event.type, e.g. src/**/event*, src/**/logger*, src/**/session*
