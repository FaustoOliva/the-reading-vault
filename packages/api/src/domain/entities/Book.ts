export interface BookProps {
  id?: number;
  author_id?: number | null;
  title: string;
  isbn?: string | null;
  total_pages?: number | null;
  status_id?: number | null;
  score?: number | null;
  author_name?: string | null;
  status_name?: string | null;
  ui_color?: string | null;
  comment?: string | null;
}

export class Book {
  public readonly id?: number;
  public author_id?: number | null;
  public title: string;
  public isbn?: string | null;
  public total_pages?: number | null;
  public status_id?: number | null;
  public score?: number | null;
  public author_name?: string | null;
  public status_name?: string | null;
  public ui_color?: string | null;
  public comment?: string | null;

  constructor(props: BookProps) {
    this.id = props.id;
    this.author_id = props.author_id ?? null;
    this.title = props.title;
    this.isbn = props.isbn ?? null;
    this.total_pages = props.total_pages ?? null;
    this.status_id = props.status_id ?? null;
    this.score = props.score ?? null;
    this.author_name = props.author_name ?? null;
    this.status_name = props.status_name ?? null;
    this.ui_color = props.ui_color ?? null;
    this.comment = props.comment ?? null;
  }
}
