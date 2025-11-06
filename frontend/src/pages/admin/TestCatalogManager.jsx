import React, { useState, useEffect, useMemo } from "react";
import {
  Save,
  Pencil,
  Trash2,
  Search,
  Filter,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  ChevronDownSquare,
  XCircle,
  X as XIcon,
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import toast from "react-hot-toast";
import labConfigService from "../../services/labConfigService";

const TestCatalogManager = () => {
  const token = JSON.parse(localStorage.getItem("userInfo"))?.token;

  // =============================================================
  // 🧱 State
  // =============================================================
  const [tests, setTests] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [sampleTypes, setSampleTypes] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    id: null,
    test_name: "",
    price: "",
    department_id: "",
    sample_type_id: "",
    unit_id: "",
    is_active: true,
  });

  const [editing, setEditing] = useState(false);

  // 🔍 Filters
  const [filterDept, setFilterDept] = useState("");
  const [filterSample, setFilterSample] = useState("");
  const [search, setSearch] = useState("");

  // ↕️ Sorting (kept for future clickable headers if you want)
  const [sortConfig, setSortConfig] = useState({
    key: "test_name",
    direction: "asc",
  });

  // ⤵️ Collapsible groups
  const [collapsedDepts, setCollapsedDepts] = useState({});

  // =============================================================
  // 🔄 Load All Data
  // =============================================================
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [tRes, dRes, sRes, uRes] = await Promise.all([
          labConfigService.getAllTests(token),
          labConfigService.getDepartments(token),
          labConfigService.getSampleTypes(token),
          labConfigService.getUnits(token),
        ]);

        const testsData = (Array.isArray(tRes?.data) ? tRes.data : tRes || []).map(
          (t) => ({ ...t, test_name: t.test_name || t.name })
        );
        setTests(testsData);
        setDepartments(Array.isArray(dRes?.data) ? dRes.data : dRes || []);
        setSampleTypes(Array.isArray(sRes?.data) ? sRes.data : sRes || []);
        setUnits(Array.isArray(uRes?.data) ? uRes.data : uRes || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load configuration");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // =============================================================
  // 💾 Create / Update Test (Fixed Payload)
  // =============================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.test_name, // ✅ backend expects `name`
        price: Number(form.price),
        department_id: Number(form.department_id),
        sample_type_id: form.sample_type_id ? Number(form.sample_type_id) : null,
        unit_id: form.unit_id ? Number(form.unit_id) : null,
        is_active: form.is_active ?? true,
      };

      if (!payload.name || !payload.department_id || !payload.price) {
        toast.error("Please fill in Name, Department, and Price");
        return;
      }

      if (editing && form.id) {
        await labConfigService.updateTest(form.id, payload, token);
        toast.success("✅ Test updated!");
      } else {
        await labConfigService.createTest(payload, token);
        toast.success("✅ Test created!");
      }

      setForm({
        id: null,
        test_name: "",
        price: "",
        department_id: "",
        sample_type_id: "",
        unit_id: "",
        is_active: true,
      });
      setEditing(false);

      const res = await labConfigService.getAllTests(token);
      const testsData = (Array.isArray(res?.data) ? res.data : res || []).map(
        (t) => ({ ...t, test_name: t.test_name || t.name })
      );
      setTests(testsData);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to save test");
    }
  };

  // =============================================================
  // ✏️ Edit / Delete
  // =============================================================
  const handleEdit = (test) => {
    setForm({
      id: test.id,
      test_name: test.test_name || test.name,
      price: test.price || "",
      department_id: test.department_id || "",
      sample_type_id: test.sample_type_id || "",
      unit_id: test.unit_id || "",
      is_active: test.is_active ?? true,
    });
    setEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setForm({
      id: null,
      test_name: "",
      price: "",
      department_id: "",
      sample_type_id: "",
      unit_id: "",
      is_active: true,
    });
    setEditing(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this test?")) return;
    try {
      await labConfigService.deleteTest(id, token);
      toast.success("🗑️ Deleted!");
      setTests((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      toast.error("Failed to delete test");
    }
  };

  // =============================================================
  // 🔘 Toggle Active / Inactive
  // =============================================================
  const toggleActive = async (test) => {
    try {
      const updated = { ...test, is_active: !test.is_active };
      await labConfigService.updateTest(
        test.id,
        { name: test.test_name, is_active: updated.is_active },
        token
      );
      toast.success(`Test ${updated.is_active ? "activated" : "deactivated"}!`);
      setTests((prev) =>
        prev.map((t) =>
          t.id === test.id ? { ...t, is_active: updated.is_active } : t
        )
      );
    } catch (err) {
      toast.error("Failed to toggle status");
      console.error(err);
    }
  };

  // =============================================================
  // 🔎 Filtering + Sorting
  // =============================================================
  const filteredAndSorted = useMemo(() => {
    const source = Array.isArray(tests) ? tests : [];
    let filtered = source.filter((t) => {
      const matchesDept = filterDept ? t.department_id === Number(filterDept) : true;
      const matchesSample = filterSample ? t.sample_type_id === Number(filterSample) : true;
      const matchesSearch = search
        ? (t.test_name || "").toLowerCase().includes(search.toLowerCase()) ||
          (t.sample_type_name || "").toLowerCase().includes(search.toLowerCase()) ||
          (t.department_name || "").toLowerCase().includes(search.toLowerCase())
        : true;
      return matchesDept && matchesSample && matchesSearch;
    });

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key] ?? "";
        const bVal = b[sortConfig.key] ?? "";
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
        }
        return sortConfig.direction === "asc"
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
    }
    return filtered;
  }, [tests, filterDept, filterSample, search, sortConfig]);

  // =============================================================
  // 🧩 Group by Department
  // =============================================================
  const groupedByDept = useMemo(() => {
    const groups = {};
    (filteredAndSorted || []).forEach((t) => {
      const dept = t.department_name || "General";
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(t);
    });
    return groups;
  }, [filteredAndSorted]);

  // =============================================================
  // 📦 Export helpers
  // =============================================================
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    Object.entries(groupedByDept).forEach(([dept, list]) => {
      const ws = XLSX.utils.json_to_sheet(
        list.map((t) => ({
          Test: t.test_name,
          Department: t.department_name,
          Sample: t.sample_type_name,
          Unit: t.unit_symbol,
          Price: t.price,
          Active: t.is_active ? "Yes" : "No",
        }))
      );
      XLSX.utils.book_append_sheet(wb, ws, dept.substring(0, 30));
    });
    XLSX.writeFile(wb, "TestCatalog_By_Department.xlsx");
  };

  const exportToCSV = () => {
    let csv = "Department,Test,Sample,Unit,Price,Active\n";
    Object.entries(groupedByDept).forEach(([dept, list]) => {
      list.forEach((t) => {
        csv += `${dept},${t.test_name},${t.sample_type_name},${t.unit_symbol},${t.price},${
          t.is_active ? "Yes" : "No"
        }\n`;
      });
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "TestCatalog_By_Department.csv");
  };

  const resetFilters = () => {
    setFilterDept("");
    setFilterSample("");
    setSearch("");
  };

  // =============================================================
  // 🖼️ UI
  // =============================================================
  if (loading)
    return (
      <div className="p-6 text-gray-600 text-center">
        Loading test catalog...
      </div>
    );

  return (
    <div className="p-4">
      {/* =============================================================
          🧩 Add / Edit Test Form
      ============================================================= */}
      <form onSubmit={handleSubmit} className="bg-white border rounded-lg shadow-sm p-4 mb-5">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          {editing ? "✏️ Edit Test" : "➕ Add New Test"}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Test Name"
            className="border p-2 rounded"
            value={form.test_name}
            onChange={(e) => setForm({ ...form, test_name: e.target.value })}
            required
          />

          <input
            type="number"
            placeholder="Price"
            className="border p-2 rounded"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            required
          />

          <select
            className="border p-2 rounded"
            value={form.department_id}
            onChange={(e) => setForm({ ...form, department_id: Number(e.target.value) })}
            required
          >
            <option value="">Select Department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            className="border p-2 rounded"
            value={form.sample_type_id}
            onChange={(e) => setForm({ ...form, sample_type_id: Number(e.target.value) })}
          >
            <option value="">Select Sample Type</option>
            {sampleTypes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            className="border p-2 rounded"
            value={form.unit_id}
            onChange={(e) => setForm({ ...form, unit_id: Number(e.target.value) })}
          >
            <option value="">Select Unit</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.symbol || u.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-1"
          >
            <Save size={16} />
            {editing ? "Update Test" : "Add Test"}
          </button>

          {editing && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 flex items-center gap-1"
            >
              <XCircle size={16} /> Cancel
            </button>
          )}
        </div>
      </form>

      {/* =============================================================
          🔎 Filters (RESTORED) 
      ============================================================= */}
      <div className="flex flex-wrap items-center gap-2 mb-3 bg-gray-50 p-2 rounded">
        <Filter className="text-gray-500" size={18} />
        <select
          className="border p-2 rounded"
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <select
          className="border p-2 rounded"
          value={filterSample}
          onChange={(e) => setFilterSample(e.target.value)}
        >
          <option value="">All Sample Types</option>
          {sampleTypes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <div className="flex items-center border rounded p-1">
          <Search size={16} className="text-gray-500 mx-1" />
          <input
            className="outline-none border-none"
            placeholder="Search by name, dept, or sample..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="px-1 text-gray-500 hover:text-gray-700"
              title="Clear search"
            >
              <XIcon size={16} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={resetFilters}
          className="ml-auto bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300 flex items-center gap-1"
          title="Reset filters"
        >
          <XIcon size={16} /> Reset
        </button>
      </div>

      {/* =============================================================
          📊 Grouped Table
      ============================================================= */}
      <div className="border rounded-lg overflow-hidden">
        {Object.entries(groupedByDept).map(([dept, list]) => (
          <div key={dept}>
            <div
              onClick={() =>
                setCollapsedDepts((prev) => ({
                  ...prev,
                  [dept]: !prev[dept],
                }))
              }
              className="bg-blue-50 font-semibold px-4 py-2 cursor-pointer flex justify-between items-center hover:bg-blue-100"
            >
              <span>
                {dept} <span className="text-xs text-gray-500">({list.length})</span>
              </span>
              {collapsedDepts[dept] ? (
                <ChevronRight size={18} />
              ) : (
                <ChevronDownSquare size={18} />
              )}
            </div>

            {!collapsedDepts[dept] && (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="p-2">Name</th>
                    <th className="p-2">Sample</th>
                    <th className="p-2">Unit</th>
                    <th className="p-2 text-right">Price</th>
                    <th className="p-2 text-center">Active</th>
                    <th className="p-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((t) => (
                    <tr
                      key={t.id}
                      className={`border-b ${
                        t.is_active
                          ? "hover:bg-gray-50"
                          : "bg-gray-100 text-gray-400 opacity-70"
                      }`}
                    >
                      <td className="p-2">{t.test_name}</td>
                      <td className="p-2">{t.sample_type_name}</td>
                      <td className="p-2">{t.unit_symbol}</td>
                      <td className="p-2 text-right">{t.price}</td>
                      <td className="p-2 text-center">
                        {t.is_active ? "✅" : "❌"}
                      </td>
                      <td className="p-2 flex justify-center gap-3">
                        <button
                          onClick={() => handleEdit(t)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          onClick={() => toggleActive(t)}
                          className={`${
                            t.is_active ? "text-green-600" : "text-gray-400"
                          } hover:scale-110 transition`}
                        >
                          {t.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>

      {/* Optional: quick export buttons (uncomment if you want)
      <div className="mt-3 flex gap-2">
        <button onClick={exportToExcel} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
          Export Excel
        </button>
        <button onClick={exportToCSV} className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600">
          Export CSV
        </button>
      </div>
      */}
    </div>
  );
};

export default TestCatalogManager;
