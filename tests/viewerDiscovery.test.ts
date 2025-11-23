import { describe, expect, it, afterAll } from "vitest"
import { resolve } from "node:path"

const fixtureDir = resolve(process.cwd(), "tests/fixtures/home-sessions")
const previousEnv = process.env.CODEX_SESSION_DIR
process.env.CODEX_SESSION_DIR = fixtureDir

import { discoverProjectAssets } from "~/lib/viewerDiscovery.server"

afterAll(() => {
  if (previousEnv === undefined) {
    delete process.env.CODEX_SESSION_DIR
  } else {
    process.env.CODEX_SESSION_DIR = previousEnv
  }
})

describe("discoverProjectAssets", () => {
  it("includes sessions from CODEX_SESSION_DIR", async () => {
    const snapshot = await discoverProjectAssets()
    const externalAsset = snapshot.sessionAssets.find((asset) =>
      asset.path.includes("tests/fixtures/home-sessions/demo/demo-20240105.jsonl")
    )

    expect(externalAsset).toBeDefined()
    expect(externalAsset?.url.startsWith("file://")).toBe(true)
    expect(externalAsset?.size).toBeGreaterThan(0)
  })

  it("includes sessions from the current user's ~/.codex/sessions", async () => {
    const previousHome = process.env.HOME
    try {
      process.env.HOME = resolve(process.cwd(), "tests/fixtures/fake-home")

      const snapshot = await discoverProjectAssets()
      const homeAsset = snapshot.sessionAssets.find((asset) => asset.path.includes("from-home/home-20231231.jsonl"))

      expect(homeAsset).toBeDefined()
      expect(homeAsset?.path.startsWith("~/.codex/sessions")).toBe(true)
    } finally {
      if (previousHome === undefined) {
        delete process.env.HOME
      } else {
        process.env.HOME = previousHome
      }
    }
  })
})
