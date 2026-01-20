export class IntegrityConstraintViolation extends Error {
  public statusCode = 409;

  constructor(message: string) {
    super(message);
    this.name = "IntegrityConstraintViolation";
  }
}

export default IntegrityConstraintViolation;
