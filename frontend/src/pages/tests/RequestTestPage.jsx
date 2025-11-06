// src/pages/tests/RequestTestPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Beaker,
  Layers,
  PlusCircle,
  CheckCircle2,
  X,
  Send,
  ArrowLeft,
  Search,
  Filter,
} from "lucide-react";
import toast from "react-hot-toast";
import labConfigService from "../../services/labConfigService";
import testRequestService from "../../services/testRequestService";
import patientService from "../../services/patientService";

/* =============================================================
   🔐 Token Helper
============================================================= */
const getToken = () => {
  try {
    const raw = localStorage.getItem("userInfo");
    if (!raw) return "";
    const parsed = raw.startsWith("{") ? JSON.parse(raw) : { token: raw };
    return parsed?.token || parsed?.me?.token || "";
  } catch {
    return "";
  }
};

/* =============================================================
   🧪 Unified Request Test Page (Analytes + Panels)
============================================================= */
const RequestTestPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = getToken();

  const [patient, setPatient] = useState(null);

  // unified catalog
  const [items, setItems] = useState([]); // [{id, name, price, is_panel, department_name, ...}]
  const [departments, setDepartments] = useState([]);

  // selection
  const [selectedItems, setSelectedItems] = useState([]);

  // filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [typeFilter, setTypeFilter] = useState("all"); // 'all' | 'panel' | 'analyte'

  // status
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  /* ===========================================================
     🔄 Load Patient + Unified Catalog
  =========================================================== */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const [patientRes, catalogRes, deptsRes] = await Promise.all([
          patientService.getPatientById(id, token),
          // ⬇️ single call that MUST return both analytes + panels (is_panel flag)
          labConfigService.getAllCatalogTests(token),
          labConfigService.getDepartments(token).catch(() => []),
        ]);

        setPatient(patientRes);

        // normalize catalog rows
        const catalog = (catalogRes?.data || catalogRes || []).map((row) => {
          const name = row.name || row.test_name || "(Unnamed)";
          const dept =
            row.department_name || row.department || row.dept || "Unassigned";
          const isPanel = Boolean(row.is_panel);
          return {
            ...row,
            id: Number(row.id),
            name,
            department_name: dept,
            is_panel: isPanel,
            type: isPanel ? "panel" : "analyte",
            label: isPanel ? "Panel" : "Analyte",
            price: Number(row.price) || 0,
          };
        });

        setItems(catalog);

        // departments (fallback: derive from items if API empty)
        const apiDepts = deptsRes?.data || deptsRes || [];
        const derivedDepts = [
          ...new Set(catalog.map((i) => i.department_name || "Unassigned")),
        ].map((n, idx) => ({ id: idx + 1, name: n }));
        const finalDepts =
          apiDepts.length > 0
            ? [{ id: "All", name: "All Departments" }, ...apiDepts]
            : [{ id: "All", name: "All Departments" }, ...derivedDepts];

        setDepartments(finalDepts);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load data: " + (err?.message || "Unknown error"));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, token]);

  /* ===========================================================
     🔍 Filtering & Derived
  =========================================================== */
  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      const matchesSearch = (i.name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const matchesDept =
        selectedDept === "All" ||
        i.department_name === selectedDept ||
        i.department === selectedDept;

      const matchesType =
        typeFilter === "all"
          ? true
          : typeFilter === "panel"
          ? i.is_panel === true
          : i.is_panel === false;

      return matchesSearch && matchesDept && matchesType;
    });
  }, [items, searchTerm, selectedDept, typeFilter]);

  const groupedByDept = useMemo(() => {
    const grouped = {};
    filteredItems.forEach((item) => {
      const dept = item.department_name || item.department || "Unassigned";
      if (!grouped[dept]) grouped[dept] = [];
      grouped[dept].push(item);
    });
    return grouped;
  }, [filteredItems]);

  const totalCost = useMemo(() => {
    return selectedItems
      .map((id) => items.find((x) => x.id === id))
      .filter(Boolean)
      .reduce((sum, i) => sum + (Number(i.price) || 0), 0);
  }, [selectedItems, items]);

  /* ===========================================================
     ⚙️ Handlers
  =========================================================== */
  const toggleSelect = (id) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      toast.error("Please select at least one test or panel.");
      return;
    }
    try {
      setSubmitting(true);
      await testRequestService.createTestRequest(
        { patientId: id, testIds: selectedItems },
        token
      );
      toast.success("✅ Test request created successfully!");
      navigate(`/patients/${id}`);
    } catch (err) {
      toast.error("Failed to create test request: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  /* ===========================================================
     🖼️ UI
  =========================================================== */
  if (loading)
    return (
      <div className="text-center mt-20 text-gray-500 text-lg animate-pulse">
        Loading...
      </div>
    );

  if (!patient)
    return <div className="text-center text-red-500">Patient not found.</div>;

  return (
    <div className="p-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-5"
      >
        <ArrowLeft size={20} /> Back to Patient
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* ================= LEFT SIDE ================= */}
        <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800">
            Request Tests for {patient.first_name} {patient.last_name}
          </h2>

          {/* 🔍 Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search analytes or panels..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 p-3 border rounded-lg text-base"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="pl-10 pr-3 py-3 border rounded-lg text-base min-w-[210px]"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 🧲 Type filter */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTypeFilter("all")}
                className={`px-3 py-2 rounded-lg border text-sm ${
                  typeFilter === "all"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
                title="Show all"
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("analyte")}
                className={`px-3 py-2 rounded-lg border text-sm ${
                  typeFilter === "analyte"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
                title="Analytes only"
              >
                Analytes
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("panel")}
                className={`px-3 py-2 rounded-lg border text-sm ${
                  typeFilter === "panel"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
                title="Panels only"
              >
                Panels
              </button>
            </div>
          </div>

          {/* 🧪 Unified List */}
          <div className="max-h-[70vh] overflow-y-auto border rounded-lg p-3 bg-gray-50">
            {Object.keys(groupedByDept).length === 0 ? (
              <p className="text-gray-500 italic text-sm">No items found.</p>
            ) : (
              Object.entries(groupedByDept).map(([dept, list]) => (
                <div key={dept} className="mb-5">
                  <h3 className="font-semibold text-gray-700 border-b pb-1 mb-2">
                    {dept}
                  </h3>
                  <ul className="space-y-2">
                    {list.map((item) => {
                      const isSelected = selectedItems.includes(item.id);
                      const icon = item.is_panel ? (
                        <Layers className="text-green-600" size={16} />
                      ) : (
                        <Beaker className="text-blue-600" size={16} />
                      );
                      const badgeClasses = item.is_panel
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700";

                      return (
                        <li
                          key={item.id}
                          onClick={() => toggleSelect(item.id)}
                          className={`flex justify-between items-center p-3 rounded-md cursor-pointer transition border ${
                            isSelected
                              ? "bg-blue-50 border-blue-400"
                              : "bg-white hover:bg-gray-100 border-gray-200"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {icon}
                            <div>
                              <span className="font-medium text-gray-800 block">
                                {item.name}
                              </span>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>{item.department_name || dept}</span>
                                <span
                                  className={`${badgeClasses} px-2 py-0.5 rounded-full`}
                                >
                                  {item.is_panel ? "Panel" : "Analyte"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-gray-700">
                              {(Number(item.price) || 0).toLocaleString()} Le
                            </span>
                            {isSelected ? (
                              <CheckCircle2 className="text-blue-600" size={18} />
                            ) : (
                              <PlusCircle className="text-gray-400" size={18} />
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ================= RIGHT SIDE ================= */}
        <div className="bg-white p-6 rounded-xl shadow-sm border h-fit sticky top-8">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">
            Selected Items
          </h3>

          <ul className="space-y-2 text-sm">
            {selectedItems.length === 0 ? (
              <li className="text-gray-500 italic text-sm">No items selected.</li>
            ) : (
              selectedItems.map((sid) => {
                const item = items.find((x) => x.id === sid);
                if (!item) return null;
                return (
                  <li
                    key={sid}
                    className="flex justify-between items-center border-b py-1"
                  >
                    <span>
                      {item.name}{" "}
                      <span className="text-gray-400 text-xs">
                        ({(Number(item.price) || 0).toLocaleString()} Le)
                      </span>
                    </span>
                    <button
                      onClick={() => toggleSelect(sid)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={16} />
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          {/* Total */}
          <div className="mt-6 p-4 bg-gray-50 border rounded-lg text-center">
            <p className="text-sm text-gray-600">💰 Estimated Total</p>
            <p className="text-2xl font-bold text-green-700 mt-1">
              {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })} Le
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || selectedItems.length === 0}
            className="w-full mt-5 bg-blue-600 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 disabled:bg-gray-400 transition"
          >
            {submitting ? "Submitting..." : "Submit Request"} <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RequestTestPage;
