import { describe, expect, it, afterAll } from "vitest"
import { resolve } from "node:path"

const fixtureDir = resolve(process.cwd(), "tests/fixtures/home-sessions")
const previousEnv = process.env.CODEX_SESSION_DIR
const previousHome = process.env.HOME
process.env.CODEX_SESSION_DIR = fixtureDir
process.env.HOME = resolve(process.cwd(), "tests/fixtures/fake-home")

import { discoverProjectAssets } from "~/lib/viewerDiscovery.server"

afterAll(() => {
  if (previousEnv === undefined) {
    delete process.env.CODEX_SESSION_DIR
  } else {
    process.env.CODEX_SESSION_DIR = previousEnv
  }
  if (previousHome === undefined) {
    delete process.env.HOME
  } else {
    process.env.HOME = previousHome
  }
})

describe("discoverProjectAssets", () => {
  it("includes sessions from CODEX_SESSION_DIR", async () => {
    const snapshot = await discoverProjectAssets()
    const codexDirectory = snapshot.inputs.externalDirectories.find((dir) =>
      dir.displayPrefix.includes("home-sessions")
    )

    expect(codexDirectory).toBeDefined()
    const externalAsset = snapshot.sessionAssets.find(
      (asset) => asset.source === "external" && asset.path.includes(codexDirectory!.displayPrefix)
    )

    expect(externalAsset).toBeDefined()
    expect(externalAsset?.path).toContain(codexDirectory!.displayPrefix)
    expect(externalAsset?.size).toBeGreaterThan(0)
  })

  it("includes sessions from the current user's ~/.codex/sessions", async () => {
    const snapshot = await discoverProjectAssets()
    const homeDirectory = snapshot.inputs.externalDirectories.find(
      (dir) => dir.displayPrefix === "~/.codex/sessions"
    )

    expect(homeDirectory).toBeDefined()
    const homeAsset = snapshot.sessionAssets.find(
      (asset) => asset.source === "external" && asset.path.includes(homeDirectory!.displayPrefix)
    )

    expect(homeAsset).toBeDefined()
    expect(homeAsset?.path).toContain(homeDirectory!.displayPrefix)
  })
})
