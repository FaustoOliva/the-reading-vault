import { BadRequestError } from "../http/BadRequestError.js";

/**
 * InvalidStateTransitionError
 * Thrown when attempting an invalid state transition
 * HTTP Status: 400 Bad Request
 */
export class InvalidStateTransitionError extends BadRequestError {
  constructor(currentState, attemptedAction) {
    super(
      `Cannot ${attemptedAction} from state ${currentState}`,
      "StateTransition",
    );
    this.currentState = currentState;
    this.attemptedAction = attemptedAction;
  }
}
