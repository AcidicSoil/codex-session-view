import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { DropZone } from "~/components/viewer/DropZone"

describe("DropZone", () => {
  it("invokes onFile when selecting through the Upload session button", () => {
    const handleFile = vi.fn()
    const { container } = render(<DropZone onFile={handleFile} />)

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(["{}"], "foo.jsonl", { type: "application/json" })

    fireEvent.change(input, { target: { files: [file] } })

    expect(handleFile).toHaveBeenCalledTimes(1)
    expect(handleFile).toHaveBeenCalledWith(file)
  })

  it("supports drag and drop uploads", () => {
    const handleFile = vi.fn()
    render(<DropZone onFile={handleFile} />)

    const dropText = screen.getByText(/Upload session log/i)
    const dropTarget = dropText.parentElement?.parentElement as HTMLElement
    const file = new File(["{}"], "bar.jsonl", { type: "application/json" })

    fireEvent.drop(dropTarget, {
      dataTransfer: {
        files: [file],
      },
      preventDefault: () => {},
    })

    expect(handleFile).toHaveBeenCalledTimes(1)
    expect(handleFile).toHaveBeenCalledWith(file)
  })

  it("invokes onFilesSelected when multiple files are chosen", () => {
    const handleFolder = vi.fn()
    const { container } = render(<DropZone onFile={vi.fn()} onFilesSelected={handleFolder} />)

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const files = [
      new File(["{}"], "foo.jsonl", { type: "application/json" }),
      new File(["{}"], "bar.jsonl", { type: "application/json" })
    ]

    fireEvent.change(input, { target: { files } })

    expect(handleFolder).toHaveBeenCalledTimes(1)
    expect(handleFolder).toHaveBeenCalledWith(files)
  })
})
