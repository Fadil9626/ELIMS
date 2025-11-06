import React, { useState } from "react";
import { uploadTestCSVs, ImportResult } from "@/services/importService";

export default function TestImportPage() {
  const [testsFile, setTestsFile] = useState<File | null>(null);
  const [rangesFile, setRangesFile] = useState<File | null>(null);
  const [deptOverride, setDeptOverride] = useState<string>(""); // blank = use CSV
  const [dryRun, setDryRun] = useState(true);
  const [createUnits, setCreateUnits] = useState(true);
  const [createDepts, setCreateDepts] = useState(true);
  const [createSamples, setCreateSamples] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const token = localStorage.getItem("token") || "";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setResult(null);
    if (!testsFile || !rangesFile) { setError("Choose both CSV files."); return; }
    setBusy(true);
    try {
      const r = await uploadTestCSVs({
        token,
        testsFile, rangesFile,
        departmentOverride: deptOverride || undefined,
        dryRun,
        createMissingUnits: createUnits,
        createMissingDepartments: createDepts,
        createMissingSampleTypes: createSamples,
      });
      setResult(r);
    } catch (err:any) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Bulk Test Import (All Departments)</h1>
      <p className="text-sm text-gray-600 mb-4">
        Upload the two CSVs. Leave “Department Override” empty to use the <code>department_name</code> column per row — so one CSV can mix Hematology, Microbiology, etc.
      </p>

      <form onSubmit={onSubmit} className="space-y-4 border rounded p-4">
        <div>
          <label className="block font-medium">Tests CSV</label>
          <input type="file" accept=".csv" onChange={(e)=>setTestsFile(e.target.files?.[0] || null)} />
        </div>
        <div>
          <label className="block font-medium">Reference Ranges CSV</label>
          <input type="file" accept=".csv" onChange={(e)=>setRangesFile(e.target.files?.[0] || null)} />
        </div>

        <div>
          <label className="block font-medium">Department Override (optional)</label>
          <input className="border rounded px-2 py-1 w-full"
                 placeholder="e.g., Hematology, Microbiology… (leave blank to use CSV)"
                 value={deptOverride}
                 onChange={(e)=>setDeptOverride(e.target.value)} />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={dryRun} onChange={e=>setDryRun(e.target.checked)} />
            Dry run (don’t write to DB)
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={createUnits} onChange={e=>setCreateUnits(e.target.checked)} />
            Auto-create missing Units
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={createDepts} onChange={e=>setCreateDepts(e.target.checked)} />
            Auto-create missing Departments
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={createSamples} onChange={e=>setCreateSamples(e.target.checked)} />
            Auto-create missing Sample Types
          </label>
        </div>

        <button className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50" disabled={busy}>
          {busy ? "Importing…" : "Start Import"}
        </button>
      </form>

      {error && <div className="mt-4 bg-red-50 text-red-700 p-3 rounded">{error}</div>}

      {result && (
        <div className="mt-6 border rounded p-4">
          <h2 className="font-semibold mb-2">Summary</h2>
          <ul className="list-disc pl-5">
            <li>Tests seen: {result.tests_seen}</li>
            <li>Tests created: {result.tests_created}</li>
            <li>Tests existing: {result.tests_existing}</li>
            <li>Ranges seen: {result.ranges_seen}</li>
            <li>Ranges inserted: {result.ranges_inserted}</li>
            <li>Ranges skipped: {result.ranges_skipped}</li>
          </ul>
          {!!result.warnings?.length && (
            <details className="mt-3">
              <summary className="cursor-pointer">Warnings ({result.warnings.length})</summary>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                {result.warnings.map((w,i)=><li key={i}>{w}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
