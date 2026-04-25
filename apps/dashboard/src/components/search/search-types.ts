export type LocalSearchGroup = "Pages" | "Quick Actions";

export type LocalSearchItem = {
  id: string;
  group: LocalSearchGroup;
  href: string;
  keywords: string[];
  subtitle: string | null;
  title: string;
};

export type RemoteSearchItem = {
  id: string;
  group: "Students" | "Staff";
  href: string;
  rank: number;
  subtitle: string | null;
  title: string;
  type: "student" | "staff";
};

export type SearchItem = {
  href: string;
  id: string;
  group: LocalSearchGroup | "Students" | "Staff";
  rank: number;
  subtitle: string | null;
  title: string;
  type: "page" | "action" | "student" | "staff";
};
