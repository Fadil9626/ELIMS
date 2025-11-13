import React, { useEffect, useState, useCallback } from "react";
import {
  FlaskConical,
  CheckCircle,
  AlertTriangle,
  FileCheck2,
  FileText,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Beaker,
  Microscope,
  BadgeCheck,
  History,
  Download,
  X,
} from "lucide-react";
import pathologistService, {
  type WorklistItem,
  type WorklistFilters,
  type StatusCounts,
  type ResultTemplate,
  type ResultTemplateItem,
} from "../../services/pathologistService";
import { useAuth } from "../../context/AuthContext";

// ----------------------------- Helpers ------------------------------
const cn = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");
const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleString() : "—");

// ----------------------------- Component ----------------------------
const PathologyDashboardS3: React.FC = () => {
  const { user, can } = useAuth();
  
  // Security Guard: Exit early if user or permissions aren't loaded
  if (!user || !can) return null; 

  // Token retrieval clean up: Use optional chaining instead of 'as any' multiple times
  const token = user.token || localStorage.getItem("token") || "";

  // Define roles based on PERMISSIONS (Fix from prior debugging)
  const isPathologist = can("Pathologist", "Verify");
  // Lab Tech can enter results, but should be separated from Pathologists who can verify
  const isLabTech = can("Results", "Enter") && !isPathologist; 

  // Filters & data
  const [filters, setFilters] = useState<WorklistFilters>({ status: "in_progress", order: "desc", sortBy: "updated_at" });
  const [worklist, setWorklist] = useState<WorklistItem[]>([]);
  const [counts, setCounts] = useState<StatusCounts>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [expandedFilters, setExpandedFilters] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<WorklistItem | null>(null);
  const [template, setTemplate] = useState<ResultTemplate | null>(null);
  const [templateDraft, setTemplateDraft] = useState<Record<number, any>>({}); // key: test_item_id → value
  const [submitting, setSubmitting] = useState(false);

  // --------------- Data loaders ---------------
  const loadCounts = useCallback(async () => {
    try {
      const c = await pathologistService.getStatusCounts(token);
      setCounts(c || {});
    } catch (e: any) {
      console.error(e);
    }
  }, [token]);

  const loadWorklist = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await pathologistService.getWorklist(token, filters);
      setWorklist(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to load worklist");
    } finally {
      setLoading(false);
    }
  }, [token, filters]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  useEffect(() => {
    loadWorklist();
  }, [loadWorklist]);

  // --------------- Filters ---------------
  const setQuickRange = (range: "today" | "7d" | "30d" | "all") => {
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    let from: string | undefined;
    if (range === "today") from = to;
    else if (range === "7d") from = new Date(now.getTime() - 6 * 86400000).toISOString().slice(0, 10);
    else if (range === "30d") from = new Date(now.getTime() - 29 * 86400000).toISOString().slice(0, 10);
    else from = undefined;
    setFilters((f) => ({ ...f, from, to: range === "all" ? undefined : to }));
  };

  // --------------- Result Drawer ---------------
  const openResult = async (item: WorklistItem) => {
    try {
      setActiveItem(item);
      setResultOpen(true);
      setTemplate(null);
      setTemplateDraft({});
      const t = await pathologistService.getResultTemplate(token, item.request_id);
      setTemplate(t);
      // Pre-fill existing results into the draft
      const draft: Record<number, any> = {};
      t.items.forEach((it) => {
        if (it.analytes && it.analytes.length > 0) {
          it.analytes.forEach((a) => (draft[a.test_id] = a.result_value ?? ""));
        } else {
          draft[it.test_id] = it.result_value ?? "";
        }
      });
      setTemplateDraft(draft);
    } catch (e) {
      console.error(e);
    }
  };

  const closeResult = () => {
    setResultOpen(false);
    setActiveItem(null);
    setTemplate(null);
    setTemplateDraft({});
  };

  const handleValueChange = (testId: number, val: any) => {
    setTemplateDraft((d) => ({ ...d, [testId]: val }));
  };

  const submitAll = async () => {
    if (!template) return;
    setSubmitting(true);
    try {
      // Submit leaf items only (analytes or standalone items)
      const leafs: ResultTemplateItem[] = [];
      template.items.forEach((it) => {
        if (it.analytes && it.analytes.length > 0) leafs.push(...it.analytes);
        else leafs.push(it);
      });

      for (const leaf of leafs) {
        const val = templateDraft[leaf.test_id];
        if (val !== undefined) {
          await pathologistService.submitResult(token, leaf.request_item_id || leaf.test_id, val);
        }
      }
      
      // Optionally move to completed for lab techs
      if (isLabTech && activeItem?.test_item_id) {
        await pathologistService.updateRequestItemStatus(activeItem.test_item_id, "completed", token);
      }
      await loadWorklist();
      closeResult();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to submit results");
    } finally {
      setSubmitting(false);
    }
  };

  // --------------- Row actions ---------------
  const adoptAnalyzer = async (row: WorklistItem) => {
    try {
      await pathologistService.adoptAnalyzerResults(token, row.test_item_id, { overwrite: true });
      await loadWorklist();
    } catch (e: any) {
      alert(e?.message || "Failed to adopt analyzer results");
    }
  };

  const markForReview = async (row: WorklistItem) => {
    try {
      await pathologistService.markForReview(token, row.test_item_id);
      await loadWorklist();
    } catch (e: any) {
      alert(e?.message || "Failed to mark for review");
    }
  };

  const verify = async (row: WorklistItem) => {
    try {
      await pathologistService.verifyResult(token, row.test_item_id);
      await loadWorklist();
    } catch (e: any) {
      alert(e?.message || "Failed to verify");
    }
  };

  const reopen = async (row: WorklistItem) => {
    try {
      await pathologistService.reopenResult(token, row.test_item_id);
      await loadWorklist();
    } catch (e: any) {
      alert(e?.message || "Failed to reopen");
    }
  };

  const release = async (row: WorklistItem) => {
    try {
      await pathologistService.releaseReport(token, row.request_id);
      await loadWorklist();
    } catch (e: any) {
      alert(e?.message || "Failed to release report");
    }
  };

  const setItemStatus = async (row: WorklistItem, status: string) => {
    try {
      await pathologistService.updateRequestItemStatus(row.test_item_id, status, token);
      await loadWorklist();
    } catch (e: any) {
      alert(e?.message || "Failed to update status");
    }
  };

  // --------------- UI computed ---------------
  const statusPills = [
    { key: "sample_collected", label: "Collected", icon: Beaker, value: counts.sample_collected || 0 },
    { key: "in_progress", label: "In Progress", icon: FlaskConical, value: counts.in_progress || 0 },
    { key: "completed", label: "Completed", icon: FileCheck2, value: counts.completed || 0 },
    { key: "verified", label: "Verified", icon: BadgeCheck, value: counts.verified || 0 },
    { key: "released", label: "Released", icon: FileText, value: counts.released || 0 },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lab Worklist</h1>
          <p className="text-sm text-gray-500">Unified dashboard — {isPathologist ? "Pathologist" : isLabTech ? "Lab Technician" : "User"}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => loadWorklist()} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 ring-1 ring-gray-300 hover:bg-gray-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statusPills.map((p) => (
          <div key={p.key} className="rounded-2xl bg-white ring-1 ring-gray-200 p-4 shadow-sm flex items-center gap-3">
            <p.icon className="h-5 w-5" />
            <div>
              <div className="text-xs text-gray-500">{p.label}</div>
              <div className="text-lg font-semibold">{p.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {/* Disabled search to mirror earlier request */}
          <div className="relative grow max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              disabled
              placeholder="Search is temporarily disabled"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 py-2 text-sm text-gray-500 cursor-not-allowed"
            />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setQuickRange("today")} className="px-3 py-2 text-sm rounded-xl ring-1 ring-gray-300 hover:bg-gray-50">Today</button>
            <button onClick={() => setQuickRange("7d")} className="px-3 py-2 text-sm rounded-xl ring-1 ring-gray-300 hover:bg-gray-50">7d</button>
            <button onClick={() => setQuickRange("30d")} className="px-3 py-2 text-sm rounded-xl ring-1 ring-gray-300 hover:bg-gray-50">30d</button>
            <button onClick={() => setQuickRange("all")} className="px-3 py-2 text-sm rounded-xl ring-1 ring-gray-300 hover:bg-gray-50">All</button>
          </div>
          <button
            onClick={() => setExpandedFilters((v) => !v)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl ring-1 ring-gray-300 hover:bg-gray-50"
          >
            <Filter className="h-4 w-4" /> More filters {expandedFilters ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
          </button>
        </div>
        {expandedFilters && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <select
              value={filters.status || ""}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined }))}
              className="rounded-xl ring-1 ring-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Any status</option>
              <option value="sample_collected">Sample Collected</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="verified">Verified</option>
              <option value="released">Released</option>
            </select>
            <input
              placeholder="Department (e.g., Chemistry)"
              value={filters.department || ""}
              onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value || undefined }))}
              className="rounded-xl ring-1 ring-gray-300 px-3 py-2 text-sm"
            />
            <select
              value={filters.sortBy || "updated_at"}
              onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value }))}
              className="rounded-xl ring-1 ring-gray-300 px-3 py-2 text-sm"
            >
              <option value="updated_at">Last Updated</option>
              <option value="date_ordered">Date Ordered</option>
              <option value="patient_name">Patient Name</option>
              <option value="test_name">Test</option>
            </select>
            <select
              value={filters.order || "desc"}
              onChange={(e) => setFilters((f) => ({ ...f, order: e.target.value as "asc" | "desc" }))}
              className="rounded-xl ring-1 ring-gray-300 px-3 py-2 text-sm"
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white ring-1 ring-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3">Patient</th>
                <th className="text-left px-4 py-3">Lab ID</th>
                <th className="text-left px-4 py-3">Test</th>
                <th className="text-left px-4 py-3">Department</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Updated</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">Loading…</td></tr>
              )}
              {!loading && error && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-red-600">{error}</td></tr>
              )}
              {!loading && !error && worklist.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">No items</td></tr>
              )}
              {worklist.map((row) => (
                <tr key={`${row.request_id}-${row.test_item_id}`} className="border-t border-gray-100">
                  <td className="px-4 py-3">{row.patient_name}</td>
                  <td className="px-4 py-3">{row.lab_id}</td>
                  <td className="px-4 py-3">{row.test_name}</td>
                  <td className="px-4 py-3">{row.department_name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs ring-1 ring-gray-300">
                      {row.item_status || row.test_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{formatDate(row.updated_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      {/* Shared actions */}
                      {/* The 'Result' button should be visible to both roles */}
                      {(isLabTech || isPathologist) && (
                        <button
                          onClick={() => openResult(row)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg ring-1 ring-gray-300 hover:bg-gray-50"
                          title="Enter/Update Result"
                        >
                          <Microscope className="h-4 w-4"/> Result
                        </button>
                      )}
                      {isLabTech && (
                        <>
                          <button
                            onClick={() => adoptAnalyzer(row)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg ring-1 ring-gray-300 hover:bg-gray-50"
                          >
                            <Beaker className="h-4 w-4"/> Adopt
                          </button>
                          <div className="relative inline-flex">
                            <select
                              aria-label="Set item status"
                              defaultValue={row.item_status || row.test_status}
                              onChange={(e) => setItemStatus(row, e.target.value)}
                              className="appearance-none pr-7 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg ring-1 ring-gray-300 hover:bg-gray-50"
                            >
                              <option value="sample_collected">Sample Collected</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                            </select>
                            <ChevronDown className="pointer-events-none h-4 w-4 absolute right-2 top-1/2 -translate-y-1/2" />
                          </div>
                          <button
                            onClick={() => markForReview(row)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg ring-1 ring-amber-300 hover:bg-amber-50"
                          >
                            <AlertTriangle className="h-4 w-4"/> Review
                          </button>
                        </>
                      )}
                      {isPathologist && (
                        <>
                          <button
                            onClick={() => verify(row)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg ring-1 ring-emerald-300 hover:bg-emerald-50"
                          >
                            <CheckCircle className="h-4 w-4"/> Verify
                          </button>
                          <button
                            onClick={() => reopen(row)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg ring-1 ring-gray-300 hover:bg-gray-50"
                          >
                            <History className="h-4 w-4"/> Reopen
                          </button>
                          <button
                            onClick={() => release(row)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg ring-1 ring-blue-300 hover:bg-blue-50"
                          >
                            <FileText className="h-4 w-4"/> Release
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Result Drawer */}
      {resultOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={closeResult} />
          <div className="w-full max-w-2xl h-full overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-white">
              <div>
                <div className="text-xs text-gray-500">{activeItem?.patient_name} • {activeItem?.lab_id}</div>
                <h2 className="text-lg font-semibold">Enter Results</h2>
              </div>
              <button onClick={closeResult} className="rounded-lg p-2 hover:bg-gray-50 ring-1 ring-gray-200"><X className="h-5 w-5"/></button>
            </div>

            <div className="p-4 space-y-4">
              {!template && (
                <div className="text-sm text-gray-500">Loading template…</div>
              )}

              {template && template.items.map((item) => (
                <div key={`${item.test_id}-${item.request_item_id}`} className="rounded-xl ring-1 ring-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{item.test_name}</div>
                      {item.parent_name && <div className="text-xs text-gray-500">Panel: {item.parent_name}</div>}
                      <div className="text-xs text-gray-500">Ref: {item.ref_range || "—"} {item.unit_symbol || ""}</div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full ring-1 ring-gray-300">{item.type || "quantitative"}</span>
                  </div>

                  {/* If panel analytes, render children */}
                  {item.analytes && item.analytes.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {item.analytes.map((a) => (
                        <AnalyzeRow key={a.test_id} node={a} draft={templateDraft} onChange={handleValueChange} />
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3">
                      <AnalyzeRow node={item} draft={templateDraft} onChange={handleValueChange} />
                    </div>
                  )}
                </div>
              ))}

              <div className="flex justify-end gap-2">
                <button onClick={closeResult} className="px-4 py-2 rounded-xl ring-1 ring-gray-300 hover:bg-gray-50">Cancel</button>
                <button onClick={submitAll} disabled={submitting} className={cn("px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700", submitting && "opacity-60 cursor-not-allowed")}>{submitting ? "Saving…" : "Save All"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --------------------------- Analyze Row ---------------------------
const AnalyzeRow: React.FC<{
  node: ResultTemplateItem;
  draft: Record<number, any>;
  onChange: (testId: number, val: any) => void;
}> = ({ node, draft, onChange }) => {
  const isQual = (node.type || "").toLowerCase() === "qualitative" || (node.qualitative_values && node.qualitative_values.length > 0);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
      <div className="sm:col-span-1 text-sm">
        <div className="font-medium">{node.test_name}</div>
        <div className="text-xs text-gray-500">{node.ref_range || "—"} {node.unit_symbol || ""}</div>
      </div>
      <div className="sm:col-span-2 flex items-center gap-2">
        {isQual ? (
          <select
            value={draft[node.test_id] ?? ""}
            onChange={(e) => onChange(node.test_id, e.target.value)}
            className="w-full rounded-xl ring-1 ring-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Select…</option>
            {(node.qualitative_values || ["Negative", "Positive"]).map((q) => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            inputMode="decimal"
            value={draft[node.test_id] ?? ""}
            onChange={(e) => onChange(node.test_id, e.target.value)}
            className="w-full rounded-xl ring-1 ring-gray-300 px-3 py-2 text-sm"
            placeholder={node.unit_symbol || node.unit_name || ""}
          />
        )}
      </div>
    </div>
  );
};

export default PathologyDashboardS3;