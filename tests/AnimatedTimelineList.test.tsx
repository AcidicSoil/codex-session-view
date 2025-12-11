import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { AnimatedTimelineList, type TimelineEvent } from "~/components/viewer/AnimatedTimelineList"

describe("AnimatedTimelineList numbering", () => {
  const events: TimelineEvent[] = [
    { type: "Message", role: "user", content: "first" },
    { type: "Message", role: "assistant", content: "second" },
    { type: "Message", role: "assistant", content: "third" },
  ]

  it("uses provided display numbers when rendering", () => {
    const map = new WeakMap<TimelineEvent, number>()
    events.forEach((event, index) => {
      map.set(event, index + 1)
    })

    render(
      <AnimatedTimelineList
        events={[...events].reverse()}
        searchQuery=""
        getDisplayNumber={(event) => map.get(event)}
      />,
    )

    const labels = screen.getAllByText((content) => /^#\d+\s—/.test(content))
    expect(labels).toHaveLength(3)
    expect(labels[0]).toHaveTextContent("#3")
    expect(labels[2]).toHaveTextContent("#1")
  })
})

describe("AnimatedTimelineList shell command summaries", () => {
  it("shows the command token instead of the shell_command name", () => {
    const shellEvent: TimelineEvent = {
      type: "FunctionCall",
      name: "shell_command",
      args: { command: "rg --files src --hidden" },
    }

    render(<AnimatedTimelineList events={[shellEvent]} />)

    expect(screen.getByText(/#1 — Shell rg/)).toBeInTheDocument()
  })
})
