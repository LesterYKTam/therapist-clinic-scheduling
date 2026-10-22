export const call = async (body?: unknown, query = "") => {
  const result = await fetch(
    `/api/clinic${query}`,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : undefined,
  );
  const data = await result.json();
  if (!result.ok) throw new Error(data.error || "Request failed.");
  return data;
};

// The browser tab remembers which pod holds an open shared draft.
export const EDITING_POD_KEY = "clinic-editing-pod";
