// Display name for an id, falling back to the id itself.
export const nameOf = (items: { id: string; name: string }[], id?: string | null) =>
  items.find((item) => item.id === id)?.name || id;
