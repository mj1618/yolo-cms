export type PageDoc = {
  _id: string;
  _creationTime: number;
  slug: string;
  title: string;
  body: string;
  template?: string;
  content?: Record<string, unknown>;
  published: boolean;
  createdAt: number;
  updatedAt: number;
};

export type NavbarItem =
  | { type: "page"; pageId: string }
  | { type: "link"; label: string; url: string };

export type NavbarDoc = {
  _id: string;
  _creationTime: number;
  key: string;
  template?: string;
  items: NavbarItem[];
  createdAt: number;
  updatedAt: number;
};
