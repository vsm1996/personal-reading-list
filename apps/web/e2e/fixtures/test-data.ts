/**
 * Shared test data used across E2E specs.
 */

/** A real book that exists in Open Library — used for search tests. */
export const TEST_BOOK = {
  title: "The Hobbit",
  author: "J.R.R. Tolkien",
  searchQuery: "The Hobbit Tolkien",
} as const;

/** A second book for move/multi-book scenarios. */
export const TEST_BOOK_2 = {
  title: "1984",
  author: "George Orwell",
  searchQuery: "1984 Orwell",
} as const;

/** Minimal valid Goodreads CSV with two books (one with ISBN, one without). */
export const GOODREADS_CSV_VALID = `Book Id,Title,Author,Author l-f,Additional Authors,ISBN,ISBN13,My Rating,Average Rating,Publisher,Binding,Number of Pages,Year Published,Original Publication Year,Date Read,Date Added,Bookshelves,Bookshelves with positions,Exclusive Shelf,My Review,Spoiler,Private Notes,Read Count,Recommended For,Recommended By,Owned Copies,Original Purchase Date,Original Purchase Location,Condition,Condition Description,BCID
1,The Pragmatic Programmer,David Thomas,"Thomas, David",Andy Hunt,="0135957052",="9780135957059",5,4.38,Addison-Wesley Professional,Paperback,352,2019,1999,2023/06/01,2023/05/01,read,,read,,,,1,,,0,,,,,
2,Clean Code,Robert C. Martin,"Martin, Robert C.",,="0132350882",="9780132350884",4,3.68,Prentice Hall,Paperback,431,2008,2008,2023/09/15,2023/08/01,read,,read,,,,1,,,0,,,,,
3,No ISBN Book,Unknown Author,"Author, Unknown",,,,,3.00,Some Publisher,Paperback,200,2020,2020,,2023/01/01,to-read,,to-read,,,,0,,,0,,,,,
`;

/** CSV with an invalid format (not a Goodreads export). */
export const GOODREADS_CSV_INVALID = `name,age,city
Alice,30,New York
Bob,25,London
`;
