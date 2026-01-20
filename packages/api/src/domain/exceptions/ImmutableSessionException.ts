export class ImmutableSessionException extends Error {
  public statusCode = 403;

  constructor() {
    super("Cannot modify sessions in completed reading cycles.");
    this.name = "ImmutableSessionException";
  }
}

export default ImmutableSessionException;
