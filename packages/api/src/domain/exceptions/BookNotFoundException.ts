export class BookNotFoundException extends Error {
  public statusCode = 404;

  constructor(bookId: number) {
    super(`Book with ID '${bookId}' not found.`);
    this.name = "BookNotFoundException";
  }
}

export default BookNotFoundException;
