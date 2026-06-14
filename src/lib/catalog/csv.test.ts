import { describe, it, expect } from "vitest";
import { toCsv, parseCsv, csvToRecords, normalizeHeader, parseMoneyCell } from "./csv";

describe("toCsv", () => {
  it("writes a header row + data rows", () => {
    const csv = toCsv(
      [{ name: "تصميم", price: 1000 }],
      [
        { key: "name", header: "Name" },
        { key: "price", header: "Price" },
      ]
    );
    expect(csv).toBe("Name,Price\r\nتصميم,1000");
  });

  it("quotes fields containing commas, quotes, or newlines", () => {
    const csv = toCsv(
      [{ name: 'a, b "c"', note: "line1\nline2" }],
      [
        { key: "name", header: "Name" },
        { key: "note", header: "Note" },
      ]
    );
    expect(csv).toBe('Name,Note\r\n"a, b ""c""","line1\nline2"');
  });

  it("renders null/undefined as empty", () => {
    const csv = toCsv([{ a: null, b: undefined }], [
      { key: "a", header: "A" },
      { key: "b", header: "B" },
    ]);
    expect(csv).toBe("A,B\r\n,");
  });
});

describe("parseCsv", () => {
  it("parses simple rows (LF and CRLF)", () => {
    expect(parseCsv("a,b\nc,d")).toEqual([["a", "b"], ["c", "d"]]);
    expect(parseCsv("a,b\r\nc,d")).toEqual([["a", "b"], ["c", "d"]]);
  });

  it("parses quoted fields with commas, escaped quotes, and newlines", () => {
    const rows = parseCsv('Name,Note\r\n"a, b ""c""","line1\nline2"');
    expect(rows).toEqual([
      ["Name", "Note"],
      ['a, b "c"', "line1\nline2"],
    ]);
  });

  it("ignores trailing blank lines and a UTF-8 BOM", () => {
    expect(parseCsv("﻿a,b\nc,d\n\n")).toEqual([["a", "b"], ["c", "d"]]);
  });

  it("round-trips with toCsv", () => {
    const original = [
      { name: "تصميم شعار", price: "2000" },
      { name: 'rush, "urgent"', price: "150" },
    ];
    const csv = toCsv(original, [
      { key: "name", header: "name" },
      { key: "price", header: "price" },
    ]);
    const rows = parseCsv(csv);
    expect(rows[1]).toEqual(["تصميم شعار", "2000"]);
    expect(rows[2]).toEqual(['rush, "urgent"', "150"]);
  });
});

describe("csvToRecords", () => {
  it("maps rows to normalised-header records", () => {
    const { headers, records } = csvToRecords('Name,"Unit Price",Category\nLogo,1000,Design');
    expect(headers).toEqual(["Name", "Unit Price", "Category"]);
    expect(records).toEqual([{ name: "Logo", unitprice: "1000", category: "Design" }]);
  });

  it("returns empty for empty input", () => {
    expect(csvToRecords("")).toEqual({ headers: [], records: [] });
  });
});

describe("normalizeHeader", () => {
  it("lowercases and strips spaces/underscores", () => {
    expect(normalizeHeader("Unit Price")).toBe("unitprice");
    expect(normalizeHeader("unit_price_sar")).toBe("unitpricesar");
    expect(normalizeHeader("  Name ")).toBe("name");
  });
});

describe("parseMoneyCell", () => {
  it("parses numbers, stripping currency symbols", () => {
    expect(parseMoneyCell("1,000")).toBe(1000);
    expect(parseMoneyCell("ر.س 250")).toBe(250);
    expect(parseMoneyCell("99.50")).toBe(99.5);
  });
  it("rejects blank / negative / invalid", () => {
    expect(parseMoneyCell("")).toBeNull();
    expect(parseMoneyCell(undefined)).toBeNull();
    expect(parseMoneyCell("-5")).toBeNull();
    expect(parseMoneyCell("abc")).toBeNull();
  });
});
