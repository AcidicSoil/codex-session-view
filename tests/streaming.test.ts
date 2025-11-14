import { describe, expect, it } from "vitest"
import { parseSessionToArrays } from "../streaming"

describe("streamParseSession", () => {
    it("parses meta and events from ndjson", async () => {
        const blob = new Blob(
            [
                JSON.stringify({ id: "test-session", timestamp: "2024-01-01T00:00:00Z" }) + "\n",
                JSON.stringify({ type: "Message", role: "user", content: "Hello timeline" }) + "\n",
                JSON.stringify({ type: "FunctionCall", name: "shell", args: { cmd: "echo hi" } }) + "\n"
            ],
            { type: "application/x-ndjson" }
        )

        const { meta, events, errors, stats } = await parseSessionToArrays(blob)

        expect(meta?.id).toBe("test-session")
        expect(events).toHaveLength(2)
        expect(events[0]).toMatchObject({ type: "Message", role: "user" })
        expect(errors).toHaveLength(0)
        expect(stats?.parsedEvents).toBe(2)
    })
})

