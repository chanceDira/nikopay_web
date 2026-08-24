import { describe, expect, it } from "vitest";
import { paginate } from "@/lib/paginate";

describe("paginate", () => {
  it("slices the requested page and clamps out of range", () => {
    const items = [1, 2, 3, 4, 5];

    expect(paginate(items, 2, 2)).toEqual({
      page: 2,
      pageSize: 2,
      total: 5,
      totalPages: 3,
      items: [3, 4],
    });

    expect(paginate(items, 9, 2).page).toBe(3);
    expect(paginate(items, 0, 2).page).toBe(1);
    expect(paginate([], 1, 5)).toEqual({
      page: 1,
      pageSize: 5,
      total: 0,
      totalPages: 1,
      items: [],
    });
  });
});
