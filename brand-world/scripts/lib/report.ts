// Collects designer-facing problems. Errors fail the build, warnings do not.
export class Report {
  errors: string[] = [];
  warnings: string[] = [];
  file: string;
  constructor(file: string) {
    this.file = file;
  }
  error(msg: string) {
    this.errors.push(`${this.file}: ${msg}`);
  }
  warn(msg: string) {
    this.warnings.push(`${this.file}: ${msg}`);
  }
}

export function printReports(reports: Report[]): boolean {
  let ok = true;
  for (const r of reports) {
    for (const e of r.errors) console.error(`  ✖ ${e}`);
    for (const w of r.warnings) console.warn(`  ⚠ ${w}`);
    if (r.errors.length) ok = false;
  }
  const e = reports.reduce((n, r) => n + r.errors.length, 0);
  const w = reports.reduce((n, r) => n + r.warnings.length, 0);
  console.log(`\n${e} error(s), ${w} warning(s)`);
  return ok;
}
