export interface Book {
  id: number | string;
  title: string;
  author_name: string;
  status_name: string;
  ui_color?: string;
  score?: number | null;
}
