export class BookClosedException extends Error {
  constructor(message?: string) {
    super(message ?? "Book is closed (ABANDONED)");
    this.name = "BookClosedException";
  }
}

export default BookClosedException;
