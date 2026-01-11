export interface BookProps {
  id: string;
  title: string;
  author?: string;
  isbn?: string;
  createdAt?: Date;
}

export class Book {
  public readonly id: string;
  public title: string;
  public author?: string;
  public isbn?: string;
  public createdAt: Date;

  constructor(props: BookProps) {
    this.id = props.id;
    this.title = props.title;
    this.author = props.author;
    this.isbn = props.isbn;
    this.createdAt = props.createdAt ?? new Date();
  }
}
