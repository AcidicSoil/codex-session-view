import type { ResponseItem } from "./events"
import type { FilePath, ISO8601String, Id } from "./primitives"
import type { GitInfo } from "./git"

/** Session-level metadata parsed from line 1 of the JSONL file. */
export interface SessionMeta {
    readonly id: Id<"session"> | string
    readonly timestamp: ISO8601String | string
    readonly instructions?: string
    readonly git?: GitInfo
    /** Optional schema versioning to mitigate drift. */
    readonly version?: number | string
}

/** A single file change captured during the session. */
export interface FileChange {
    readonly path: FilePath | string
    readonly diff?: string
    readonly patches?: readonly string[]
}

/** Artifact generated during the session (e.g., export, compiled asset). */
export interface Artifact {
    readonly name: string
    readonly path?: FilePath | string
    readonly contentType?: string
    readonly bytes?: Uint8Array
}

/** Parsed session bundle returned by the parser. */
export interface ParsedSession {
    readonly meta: SessionMeta
    readonly events: readonly ResponseItem[]
    readonly fileChanges: readonly FileChange[]
    readonly artifacts: readonly Artifact[]
}

export interface SessionPreviewSummary {
    readonly path: FilePath | string
    readonly byteLength: number
    readonly meta?: SessionMeta
    readonly repoName?: string
    readonly firstUserMessage?: string
    readonly firstTimestamp?: ISO8601String | string
    readonly lastTimestamp?: ISO8601String | string
    readonly agents: readonly string[]
    readonly errors: readonly string[]
    readonly tools: readonly string[]
}

