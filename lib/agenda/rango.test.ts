import { describe, expect, it } from "vitest";

import { partirRango } from "./rango";

describe("el rango de una cita, como lo escribe Postgres", () => {
  it("se parte en inicio y fin, en UTC", () => {
    expect(partirRango('["2026-09-14 14:00:00+00","2026-09-14 15:00:00+00")')).toEqual({
      inicio: "2026-09-14T14:00:00.000Z",
      fin: "2026-09-14T15:00:00.000Z",
    });
  });

  it("con la zona de Bolivia también", () => {
    expect(partirRango('["2026-09-14 10:00:00-04","2026-09-14 10:30:00-04")').inicio).toBe(
      "2026-09-14T14:00:00.000Z",
    );
  });
});
