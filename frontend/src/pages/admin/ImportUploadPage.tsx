import React, { useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { uploadImport } from "../../services/importService";

const ImportUploadPage: React.FC = () => {
  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
  const token: string = userInfo?.token;

  const [testsFile, setTestsFile] = useState<File | undefined>();
  const [rangesFile, setRangesFile] = useState<File | undefined>();
  const [department, setDepartment] = useState<string>(""); // e.g., "Hematology"
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testsFile && !rangesFile) return toast.error("Select at least one CSV.");
    try {
      setLoading(true);
      const data = await uploadImport(token, { tests: testsFile, ranges: rangesFile }, department || undefined);
      setResult(data);
      toast.success("Import submitted");
    } catch (err: any) {
      toast.error(err.message || "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow border p-6 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Upload className="text-blue-600" /> CSV Import (Tests & Reference Ranges)
      </h2>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tests CSV</label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setTestsFile(e.target.files?.[0])}
              className="block w-full border rounded p-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              Columns: <code>name,price,unit_symbol,department_name,sample_type_name,is_active</code>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Reference Ranges CSV</label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setRangesFile(e.target.files?.[0])}
              className="block w-full border rounded p-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              Columns: <code>analyte_name,range_type,gender,age_min,age_max,unit_symbol,min_value,max_value,symbol_operator,qualitative_value,note</code>
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Department override (optional)</label>
            <input
              type="text"
              placeholder='e.g. "Hematology", "Biochemistry"'
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="block w-full border rounded p-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              If set, all tests will be assigned to this department.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2 disabled:opacity-60"
        >
          <FileSpreadsheet size={18} /> {loading ? "Uploading…" : "Upload CSVs"}
        </button>
      </form>

      {result && (
        <div className="mt-4 p-4 rounded border bg-green-50 text-green-800">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 /> Import Result
          </div>
          <pre className="text-sm mt-2 overflow-auto">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default ImportUploadPage;
