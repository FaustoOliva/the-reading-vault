export class MissingScoreException extends Error {
  public statusCode = 400;

  constructor() {
    super("Score required when marking book as completed or abandoned.");
    this.name = "MissingScoreException";
  }
}

export default MissingScoreException;
