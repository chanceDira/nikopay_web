export type PageSlice<T> = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: T[];
};

export function paginate<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): PageSlice<T> {
  const size = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 1;
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * size;

  return {
    page: current,
    pageSize: size,
    total,
    totalPages,
    items: items.slice(start, start + size),
  };
}
