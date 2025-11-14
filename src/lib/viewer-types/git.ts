/** Minimal git info attached to session metadata. */
export interface GitInfo {
    readonly repo?: string
    readonly branch?: string
    readonly commit?: string
    readonly remote?: string
    readonly dirty?: boolean
}

