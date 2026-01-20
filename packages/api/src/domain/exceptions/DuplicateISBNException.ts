export class DuplicateISBNException extends Error {
  public statusCode = 409;

  constructor(isbn: string) {
    super(`A book with ISBN '${isbn}' already exists in your library.`);
    this.name = "DuplicateISBNException";
  }
}

export default DuplicateISBNException;
