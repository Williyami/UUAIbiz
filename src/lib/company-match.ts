// Legal-form words that don't distinguish one company from another.
const SUFFIXES = new Set([
  "ab",
  "aktiebolag",
  "publ",
  "inc",
  "incorporated",
  "ltd",
  "limited",
  "llc",
  "plc",
  "gmbh",
  "ag",
  "sa",
  "bv",
  "nv",
  "oy",
  "oyj",
  "as",
  "asa",
  "aps",
  "corp",
  "corporation",
  "co",
  "company",
  "group",
  "holding",
  "holdings",
]);

/** "Ericsson AB" and "ericsson" compare equal; åäö are kept as letters. */
export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter((w) => w && !SUFFIXES.has(w))
    .join(" ");
}

export type CompanyMatch<T> = { company: T; exact: boolean };

/**
 * Existing companies a new name probably duplicates. Exact means the names
 * are the same once case, punctuation and suffixes are ignored; otherwise one
 * name contains the other as whole words ("Ericsson" / "Ericsson Sweden").
 */
export function findSimilarCompanies<T extends { id: string; name: string }>(
  name: string,
  companies: T[],
  excludeId?: string | null,
): CompanyMatch<T>[] {
  const needle = normalizeCompanyName(name);
  if (needle.length < 2) return [];
  const padded = ` ${needle} `;
  const matches: CompanyMatch<T>[] = [];
  for (const c of companies) {
    if (c.id === excludeId) continue;
    const other = normalizeCompanyName(c.name);
    if (!other) continue;
    if (other === needle) {
      matches.push({ company: c, exact: true });
    } else if (
      Math.min(other.length, needle.length) >= 4 &&
      (padded.includes(` ${other} `) || ` ${other} `.includes(padded))
    ) {
      matches.push({ company: c, exact: false });
    }
  }
  return matches.sort((a, b) => Number(b.exact) - Number(a.exact)).slice(0, 3);
}
