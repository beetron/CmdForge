declare module 'better-sqlite3' {
  type AnyObj = Record<string, unknown>

  interface Statement {
    run(...params: unknown[]): { lastInsertRowid?: number; changes?: number }
    all(...params: unknown[]): AnyObj[]
    get(...params: unknown[]): AnyObj | undefined
  }

  interface Database {
    prepare(sql: string): Statement
    transaction(fn: (items: unknown[]) => void): (items: unknown[]) => void
    close(): void
  }

  function Database(filename: string, options?: AnyObj): Database
  export default Database
}
