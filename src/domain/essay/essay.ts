// Valid domain file — pure types and functions
export type EssayId = string & { readonly __brand: "EssayId" };

export type Essay = {
  id: EssayId;
  content: string;
  status: "draft" | "published";
};
