/**
 * @module tablesort
 * @description Self-produced type definitions for the TableSort library.
 * @requires none
 * @exports Tablesort
 * @exports TablesortOptions
 * @exports SortOption
 *
 * @license Plain-Unlicense
 * @copyright No rights reserved.
 */

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

    static extend(
      name: string,
      pattern: (value: string) => boolean,
      sort: (a: string, b: string) => number,
    ): void

    init(el: HTMLTableElement, options: TablesortOptions): void

    sortTable(header: HTMLTableCellElement, update?: boolean): void

    refresh(): void
  }

  export = Tablesort
}
