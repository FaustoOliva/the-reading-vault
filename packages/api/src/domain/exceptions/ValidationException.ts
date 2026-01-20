export class ValidationException extends Error {
  public statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = "ValidationException";
  }
}

export default ValidationException;
