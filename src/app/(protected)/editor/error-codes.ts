// Shared error message constants between server actions and client components.
// Kept separate from actions.ts because "use server" files can only export async functions.
export const NOT_DRAFT_ERROR = "Can only update essays in draft status";
