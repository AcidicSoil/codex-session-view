declare module 'micromatch' {
  export interface MatchOptions {
    dot?: boolean
    matchBase?: boolean
    nocase?: boolean
  }

  export function isMatch(str: string, patterns: string | readonly string[], options?: MatchOptions): boolean
}
