export class BookClosedException extends Error {
  public statusCode = 403;

  constructor(message?: string) {
    super(
      message ??
        "This book is abandoned and locked. Manually reopen to continue."
    );
    this.name = "BookClosedException";
  }
}

export default BookClosedException;
