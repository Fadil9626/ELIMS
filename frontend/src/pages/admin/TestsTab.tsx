import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusCircle,
  Pencil,
  Trash2,
  Save,
  XCircle,
  CheckCircle2,
  MinusCircle,
  Cog,
  RefreshCw,
  Search,
  SortAsc,
  SortDesc,
  Beaker,
  Filter,
  CheckSquare,
  Square,
} from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import labConfigService from "../../services/labConfigService";
import type {
  Test,
  Unit,
  Department,
  SampleType,
} from "../../services/labConfigService";

type SortKey = "test_name" | "name" | "price" | "unit_name" | "department" | "sample_type";

const badgeColors = [
  "bg-sky-100 text-sky-800",
  "bg-green-100 text-green-800",
  "bg-amber-100 text-amber-800",
  "bg-purple-100 text-purple-800",
  "bg-pink-100 text-pink-800",
  "bg-indigo-100 text-indigo-800",
  "bg-rose-100 text-rose-800",
  "bg-teal-100 text-teal-800",
];
const colorFor = (name?: string) => {
  if (!name) return "bg-gray-100 text-gray-700";
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  const idx = Math.abs(hash) % badgeColors.length;
  return badgeColors[idx];
};

const TestsTab: React.FC = () => {
  const navigate = useNavigate();
  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
  const token: string | undefined = userInfo?.token;

  const [tests, setTests] = useState<Test[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [sampleTypes, setSampleTypes] = useState<SampleType[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false); 
  const [addingTest, setAddingTest] = useState(false); 

  const [sampleTypeFilter, setSampleTypeFilter] = useState<number | "">("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkSampleTypeId, setBulkSampleTypeId] = useState<number | "">("");
  const [editTest, setEditTest] = useState<Test | null>(null);

  const [newTest, setNewTest] = useState<Partial<Test>>({
    name: "",
    price: undefined,
    unit_id: undefined,
    department_id: undefined,
    sample_type_id: undefined,
    test_type: "quantitative", // ✅ FIX: Added test_type
    qualitative_value: "",    // ✅ FIX: Added qualitative_value
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: "asc" | "desc" }>({
    key: "test_name",
    direction: "asc",
  });

  useEffect(() => {
    fetchAll(); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAll = async () => {
    if (!token) {
      toast.error("Not authenticated");
      return;
    }
    setLoading(true);
    try {
      const [testsData, depData, unitData, stData] = await Promise.all([
        labConfigService.getAllTests(token), 
        labConfigService.getDepartments(token),
        labConfigService.getUnits(token),
        labConfigService.getSampleTypes(token),
      ]);
      setTests(testsData || []);
      setDepartments(depData || []);
      setUnits(unitData || []);
      setSampleTypes(stData || []);
      setSelectedIds(new Set());
    } catch (err: any) {
      console.error(err);
      toast.error(`❌ Failed to load data: ${err?.message || "unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTest = async () => {
    if (!token) return;

    const name = String(newTest.name || "").trim();
    const price = newTest.price;

    if (!name) { 
      toast.error("Please enter a test name.");
      return;
    }
    if (price == null || isNaN(Number(price)) || Number(price) < 0) {
      toast.error("Please enter a valid, non-negative price.");
      return;
    }
    
    // ✅ FIX: Validation for qualitative options
    if (newTest.test_type === 'qualitative' && !newTest.qualitative_value?.trim()) {
      toast.error("Please enter qualitative options (e.g., Positive;Negative)");
      return;
    }

    setAddingTest(true);
    try {
      await labConfigService.createTest(
        {
          name: name, 
          price: Number(price), 
          unit_id: newTest.unit_id ? Number(newTest.unit_id) : null,
          department_id: newTest.department_id ? Number(newTest.department_id) : null,
          sample_type_id: newTest.sample_type_id ? Number(newTest.sample_type_id) : null,
          // ✅ FIX: Send new fields to the API
          test_type: newTest.test_type,
          qualitative_value: newTest.test_type === 'qualitative' ? newTest.qualitative_value : null,
        },
        token
      );
      toast.success("✅ Test added successfully!");
      setNewTest({ // Reset form
        name: "",
        price: undefined,
        unit_id: undefined,
        department_id: undefined,
        sample_type_id: undefined,
        test_type: "quantitative", // ✅ FIX: Reset new fields
        qualitative_value: "",    // ✅ FIX: Reset new fields
      });
      fetchAll(); // Refresh list
    } catch (err: any) {
      console.error("Add Test Error:", err); 
      toast.error(`❌ Failed to add test: ${err?.message || "unknown error"}`);
    } finally {
      setAddingTest(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    if (!window.confirm("Are you sure you want to deactivate this test?")) return;
    try {
      await labConfigService.deleteTest(id, token);
      toast.success("🗑️ Test deactivated");
      fetchAll();
    } catch (err: any) {
      console.error(err);
      toast.error(`❌ Failed to delete test: ${err?.message || "unknown error"}`);
    }
  };

  const handleUpdateTest = async () => {
    if (!token || !editTest) return;
    
    // ✅ FIX: Validation for qualitative options
    if (editTest.test_type === 'qualitative' && !editTest.qualitative_value?.trim()) {
      toast.error("Please enter qualitative options (e.g., Positive;Negative)");
      return;
    }
    
    try {
      await labConfigService.updateTest(
        editTest.id,
        {
          name: (editTest.name ?? editTest.test_name)?.trim(),
          price: Number(editTest.price),
          unit_id: editTest.unit_id ?? null,
          department_id: editTest.department_id ?? null,
          sample_type_id: editTest.sample_type_id ?? null,
          // ✅ FIX: Send new fields to the API
          test_type: editTest.test_type,
          qualitative_value: editTest.test_type === 'qualitative' ? editTest.qualitative_value : null,
        },
        token
      );
      toast.success("✅ Test updated successfully!");
      setEditTest(null);
      fetchAll();
    } catch (err: any) {
      console.error(err);
      toast.error(`❌ Failed to update test: ${err?.message || "unknown error"}`);
    }
  };

  const handleToggleStatus = async (t: Test) => {
    if (!token) return;
    try {
      const newStatus = !t.is_active;
      await labConfigService.toggleTestStatus(t.id, newStatus, token);
      toast.success(`Status changed to ${newStatus ? "🟢 Active" : "🔴 Inactive"}`);
      // Update local state to avoid full refetch
      setTests((prev) => prev.map((x) => (x.id === t.id ? { ...x, is_active: newStatus } : x)));
    } catch (err: any) {
      console.error(err);
      toast.error(`❌ Failed to toggle status: ${err?.message || "unknown error"}`);
    }
  };

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // --- Filtering + Sorting + Pagination (Unchanged) ---
  const filtered = useMemo(() => {
    if (!Array.isArray(tests)) return [];
    return tests.filter((t) => {
      const matchesText = (t.test_name || t.name || "").toLowerCase().includes(search.toLowerCase());
      const matchesSample =
        sampleTypeFilter === "" ? true : Number(t.sample_type_id) === Number(sampleTypeFilter);
      return matchesText && matchesSample;
    });
  }, [tests, search, sampleTypeFilter]);

  const filteredAndSorted = useMemo(() => {
    const result = [...filtered];
    result.sort((a, b) => {
      const aName = a.test_name || a.name || "";
      const bName = b.test_name || b.name || "";
      if (sortConfig.key === "test_name" || sortConfig.key === "name") {
          return sortConfig.direction === "asc" ? aName.localeCompare(bName) : bName.localeCompare(aName);
      }
      const ak = (a as any)[sortConfig.key] ?? "";
      const bk = (b as any)[sortConfig.key] ?? "";
      if (typeof ak === "string" && typeof bk === "string") {
        return sortConfig.direction === "asc" ? ak.localeCompare(bk) : bk.localeCompare(ak);
      }
      const numA = Number(ak);
      const numB = Number(bk);
      const valA = isNaN(numA) ? 0 : numA;
      const valB = isNaN(numB) ? 0 : numB;
      return sortConfig.direction === "asc" ? valA - valB : valB - valA;
    });
    return result;
  }, [filtered, sortConfig]);

  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage) || 1;
  const pageItems = filteredAndSorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // --- Bulk selection (Unchanged) ---
  const allOnPageSelected = pageItems.length > 0 && pageItems.every((t) => selectedIds.has(t.id));
  
  const toggleSelectAllOnPage = () => {
    const next = new Set(selectedIds);
    if (allOnPageSelected) {
      pageItems.forEach((t) => next.delete(t.id));
    } else {
      pageItems.forEach((t) => next.add(t.id));
    }
    setSelectedIds(next);
  };

  const toggleSelectOne = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const doBulkUpdate = async () => {
    if (!token) return;
    if (selectedIds.size === 0) return toast.error("Select at least one test.");
    if (bulkSampleTypeId === "") return toast.error("Choose a sample type to apply.");
    const ids = Array.from(selectedIds);

    try {
      setLoading(true); 
      const results = await Promise.allSettled(
        ids.map((id) =>
          labConfigService.updateTest(
            id,
            { sample_type_id: Number(bulkSampleTypeId) },
            token
          )
        )
      );
      const rejected = results.filter((r) => r.status === "rejected");
      if (rejected.length === 0) {
        toast.success(`✅ Updated ${ids.length} test(s)`);
      } else if (rejected.length < ids.length) {
        toast.success(`Updated ${ids.length - rejected.length} test(s)`);
        toast.error(`${rejected.length} update(s) failed`);
      } else {
        toast.error("All updates failed");
      }
      setSelectedIds(new Set());
      setBulkSampleTypeId("");
      fetchAll();
    } catch (e) {
      console.error(e);
      toast.error("Bulk update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
          <Beaker className="text-blue-600" /> Test Configuration
        </h2>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Add Test */}
      <motion.div
        className="bg-white rounded-xl shadow-md border p-6"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h3 className="font-semibold text-lg mb-3">Add a New Laboratory Test</h3>
        {/* ✅ FIX: Changed grid to 3 columns to make space */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Test Name"
            value={newTest.name || ""}
            onChange={(e) => setNewTest((s) => ({ ...s, name: e.target.value }))}
            className="p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <input
            type="number"
            placeholder="Price"
            step="0.01"
            min="0"
            value={newTest.price ?? ""}
            onChange={(e) =>
              setNewTest((s) => ({
                ...s,
                price: e.target.value === "" ? undefined : Number(e.target.value),
              }))
            }
            className="p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <select
            value={newTest.unit_id ?? ""}
            onChange={(e) =>
              setNewTest((s) => ({ ...s, unit_id: e.target.value ? Number(e.target.value) : undefined }))
            }
            className="p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Select Unit</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.unit_name} ({u.symbol})
              </option>
            ))}
          </select>
          <select
            value={newTest.department_id ?? ""}
            onChange={(e) =>
              setNewTest((s) => ({
                ...s,
                department_id: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
            className="p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Select Department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            value={newTest.sample_type_id ?? ""}
            onChange={(e) =>
              setNewTest((s) => ({
                ...s,
                sample_type_id: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
            className="p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Select Sample Type</option>
            {sampleTypes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          
          {/* ✅ FIX: New Test Type field */}
          <select
            value={newTest.test_type ?? "quantitative"}
            onChange={(e) =>
              setNewTest((s) => ({ ...s, test_type: e.target.value }))
            }
            className="p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="quantitative">Quantitative</option>
            <option value="qualitative">Qualitative</option>
          </select>
        </div>
        
        {/* ✅ FIX: New Qualitative Options field (conditional) */}
        {newTest.test_type === 'qualitative' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Qualitative Options (separate with semicolon ';')
            </label>
            <input
              type="text"
              placeholder="e.g., Positive;Negative;Indeterminate"
              value={newTest.qualitative_value || ""}
              onChange={(e) => setNewTest((s) => ({ ...s, qualitative_value: e.target.value }))}
              className="p-2.5 w-full border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        )}

        <button
          onClick={handleAddTest}
          disabled={addingTest}
          className="mt-5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition disabled:bg-blue-300"
        >
          {addingTest ? (
            <><RefreshCw size={18} className="animate-spin" /> Adding...</>
          ) : (
            <><PlusCircle size={18} /> Add Test</>
          )}
        </button>
      </motion.div>

      {/* --- Filters and Bulk bar (Unchanged) --- */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search test..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-500" />
            <select
              value={sampleTypeFilter}
              onChange={(e) => {
                const v = e.target.value === "" ? "" : Number(e.target.value);
                setSampleTypeFilter(v);
                setCurrentPage(1);
              }}
              className="py-2 px-3 border rounded-lg text-sm"
            >
              <option value="">All Sample Types</option>
              {sampleTypes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2 md:ml-auto">
          <span className="text-sm text-gray-600">
            Selected: <strong>{selectedIds.size}</strong>
          </span>
          <select
            value={bulkSampleTypeId}
            onChange={(e) => setBulkSampleTypeId(e.target.value === "" ? "" : Number(e.target.value))}
            className="py-2 px-3 border rounded-lg text-sm"
            disabled={selectedIds.size === 0}
          >
            <option value="">Change Sample Type…</option>
            {sampleTypes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            onClick={doBulkUpdate}
            disabled={selectedIds.size === 0 || bulkSampleTypeId === "" || loading}
            className="px-3 py-2 bg-indigo-600 disabled:bg-indigo-300 text-white rounded-lg text-sm"
          >
            Apply
          </button>
        </div>
      </div>

      {/* --- Table (Unchanged) --- */}
      <div className="bg-white rounded-xl shadow-md border p-6">
        {loading && tests.length === 0 ? ( 
          <p className="text-gray-500">Loading tests...</p>
        ) : pageItems.length === 0 ? (
          <p className="text-gray-500 italic">No tests found matching criteria.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="p-3 border-b text-left w-10">
                      <button
                        onClick={toggleSelectAllOnPage}
                        title={allOnPageSelected ? "Unselect all on page" : "Select all on page"}
                        className="p-1 rounded"
                      >
                        {allOnPageSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>
                    </th>
                    {[
                      { key: "test_name" as SortKey, label: "Name" },
                      { key: "price" as SortKey, label: "Price (Le)" },
                      { key: "unit_name" as SortKey, label: "Unit" },
                      { key: "department" as SortKey, label: "Department" },
                      { key: "sample_type" as SortKey, label: "Sample Type" },
                    ].map(({ key, label }) => (
                      <th
                        key={key}
                        className="p-3 border-b text-left cursor-pointer select-none"
                        onClick={() => handleSort(key)}
                      >
                        <div className="flex items-center gap-1">
                          {label}
                          {sortConfig.key === key &&
                            (sortConfig.direction === "asc" ? (
                              <SortAsc className="text-gray-500" size={16} />
                            ) : (
                              <SortDesc className="text-gray-500" size={16} />
                            ))}
                        </div>
                      </th>
                    ))}
                    <th className="p-3 border-b text-center">Status</th>
                    <th className="p-3 border-b text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((t) => {
                    const selected = selectedIds.has(t.id);
                    const displayName = t.test_name || t.name || 'Unnamed Test';
                    return (
                      <motion.tr key={t.id} className="hover:bg-blue-50 transition border-b" whileHover={{ scale: 1.005 }}>
                        <td className="p-3">
                          <button onClick={() => toggleSelectOne(t.id)} className="p-1 rounded">
                            {selected ? <CheckSquare size={18} /> : <Square size={18} />}
                          </button>
                        </td>
                        <td className="p-3">{displayName}</td>
                        <td className="p-3">{t.price}</td>
                        <td className="p-3">{t.unit_symbol || "—"}</td>
                        <td className="p-3">{t.department || "—"}</td>
                        <td className="p-3">
                          {t.sample_type ? (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorFor(
                                t.sample_type
                              )}`}
                            >
                              {t.sample_type}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleStatus(t)}
                            className={`flex items-center justify-center gap-1 px-3 py-1 rounded-full text-sm ${
                              t.is_active
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                          >
                            {t.is_active ? (
                              <><CheckCircle2 size={16} /> Active</>
                            ) : (
                              <><MinusCircle size={16} /> Inactive</>
                            )}
                          </button>
                        </td>
                        <td className="p-3 flex items-center justify-center gap-3">
                          <button
                            onClick={() => setEditTest(t)}
                            className="flex items-center gap-1 px-2 py-1.5 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded-md text-sm"
                          >
                            <Pencil size={16} /> Edit
                          </button>
                          <button
                            onClick={() =>
                              navigate(`/admin/test-catalog/${t.id}/configure`, {
                                state: { testName: displayName },
                              })
                            }
                            className="flex items-center gap-1 px-2 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md text-sm"
                          >
                            <Cog size={16} /> Configure
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="flex items-center gap-1 px-2 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-md text-sm"
                          >
                            <Trash2 size={16} /> Delete
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination (Unchanged) */}
            <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
              <p>
                Showing{" "}
                <strong>
                  {(currentPage - 1) * itemsPerPage + 1}-
                  {Math.min(currentPage * itemsPerPage, filteredAndSorted.length)}
                </strong>{" "}
                of <strong>{filteredAndSorted.length}</strong> tests
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded border hover:bg-gray-100 disabled:opacity-50 flex items-center gap-1"
                >
                  Prev
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded border hover:bg-gray-100 disabled:opacity-50 flex items-center gap-1"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editTest && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-xl p-6 w-full max-w-lg shadow-lg"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Edit Test</h3>
                <button onClick={() => setEditTest(null)}>
                  <XCircle className="text-gray-600" />
                </button>
              </div>

              {/* ✅ FIX: Changed to 3 columns to make space */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Test Name"
                  value={editTest.name || editTest.test_name || ""}
                  onChange={(e) => setEditTest({ ...editTest, name: e.target.value })}
                  className="p-2 border rounded"
                />
                <input
                  type="number"
                  placeholder="Price"
                  step="0.01"
                  min="0"
                  value={editTest.price ?? ""}
                  onChange={(e) => setEditTest({ ...editTest, price: Number(e.target.value) })}
                  className="p-2 border rounded"
                />
                <select
                  value={editTest.unit_id ?? ""}
                  onChange={(e) =>
                    setEditTest({ ...editTest, unit_id: e.target.value ? Number(e.target.value) : null })
                  }
                  className="p-2 border rounded"
                >
                  <option value="">Select Unit</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.unit_name} ({u.symbol})
                    </option>
                  ))}
                </select>
                <select
                  value={editTest.department_id ?? ""}
                  onChange={(e) =>
                    setEditTest({
                      ...editTest,
                      department_id: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="p-2 border rounded"
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <select
                  value={editTest.sample_type_id ?? ""}
                  onChange={(e) =>
                    setEditTest({
                      ...editTest,
                      sample_type_id: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="p-2 border rounded"
                >
                  <option value="">Select Sample Type</option>
                  {sampleTypes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                
                {/* ✅ FIX: New Test Type field */}
                <select
                  value={editTest.test_type ?? "quantitative"}
                  onChange={(e) =>
                    setEditTest({ ...editTest, test_type: e.target.value })
                  }
                  className="p-2 border rounded"
                >
                  <option value="quantitative">Quantitative</option>
                  <option value="qualitative">Qualitative</option>
                </select>
              </div>

              {/* ✅ FIX: New Qualitative Options field (conditional) */}
              {editTest.test_type === 'qualitative' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Qualitative Options (separate with semicolon ';')
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Positive;Negative;Indeterminate"
                    value={editTest.qualitative_value || ""}
                    onChange={(e) => setEditTest({ ...editTest, qualitative_value: e.target.value })}
                    className="p-2.5 w-full border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 mt-5">
                <button
                  onClick={() => setEditTest(null)}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateTest}
                  className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2 hover:bg-blue-700"
                >
                  <Save size={16} /> Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TestsTab;