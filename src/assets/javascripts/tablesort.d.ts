/* eslint-disable no-unused-vars */
declare module "tablesort" {
  interface TablesortOptions {
    sortAttribute?: string
    descending?: boolean
  }

  interface SortOption {
    name: string
    pattern: (value: string) => boolean
    sort: (a: string, b: string) => number
  }

  class Tablesort {
    constructor(el: HTMLTableElement, options?: TablesortOptions)

    static extend(name: string, pattern: (value: string) => boolean, sort: (a: string, b: string) => number): void

    init(el: HTMLTableElement, options: TablesortOptions): void

    sortTable(header: HTMLTableCellElement, update?: boolean): void

    refresh(): void
  }

  export = Tablesort
}
