export interface AuthorProps {
  id?: number;
  name: string;
  nationality?: string | null;
}

/**
 * Author Entity
 *
 * Represents an author in the domain layer.
 * Ensures immutability and encapsulation of author data.
 */
export class Author {
  public readonly id?: number;
  public readonly name: string;
  public readonly nationality?: string | null;

  constructor(props: AuthorProps) {
    this.id = props.id;
    this.name = props.name;
    this.nationality = props.nationality ?? null;
  }
}
