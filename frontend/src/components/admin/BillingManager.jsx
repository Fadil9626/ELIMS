import React, { useState, useEffect, useContext } from "react";
import labConfigService from "../../services/labConfigService";
import { SettingsContext } from "../../context/SettingsContext";
import {
  HiCheck,
  HiX,
  HiPencil,
  HiTrash,
  HiPlus,
  HiRefresh,
  HiSearch,
  HiFilter,
} from "react-icons/hi";

const BillingManager = () => {
  const [tests, setTests] = useState([]);
  const [filteredTests, setFilteredTests] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [newTest, setNewTest] = useState({
    name: "",
    price: "",
    unit_id: "",
    department_id: "",
  });
  const [currentEdit, setCurrentEdit] = useState({});
  const [currency, setCurrency] = useState("Le");
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const { settings } = useContext(SettingsContext);
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));
  const token = userInfo?.token;

  // 🔹 Fetch all data
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [testData, unitData, deptData] = await Promise.all([
        labConfigService.getTests(token),
        labConfigService.getUnits(token),
        labConfigService.getDepartments(token),
      ]);
      setTests(testData);
      setFilteredTests(testData);
      setUnits(unitData);
      setDepartments(deptData);
    } catch (err) {
      console.error("❌ Error fetching data:", err);
      setError("Failed to load data. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // 🔹 Filter Logic
  useEffect(() => {
    let filtered = [...tests];
    if (search.trim()) {
      filtered = filtered.filter((t) =>
        t.test_name.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (filterDept) {
      filtered = filtered.filter((t) => t.department_id === Number(filterDept));
    }
    if (!showInactive) {
      filtered = filtered.filter((t) => t.is_active);
    }
    setFilteredTests(filtered);
  }, [search, filterDept, showInactive, tests]);

  // 🔹 Currency Change
  const handleCurrencyChange = (e) => setCurrency(e.target.value);

  // 🔹 Edit Mode
  const handleEditClick = (test) => {
    setEditingId(test.id);
    setCurrentEdit({
      name: test.test_name,
      price: test.price,
      unit_id: test.unit_id || "",
      department_id: test.department_id || "",
    });
  };
  const handleCancelEdit = () => {
    setEditingId(null);
    setCurrentEdit({});
  };
  const handleSaveEdit = async (id) => {
    try {
      await labConfigService.updateTest(id, currentEdit, token);
      setEditingId(null);
      fetchAll();
    } catch (err) {
      console.error("❌ Update failed:", err);
      alert("Failed to save changes.");
    }
  };

  // 🔹 Add New Test
  const handleAddTest = async () => {
    try {
      if (!newTest.name || !newTest.price)
        return alert("Name and price are required.");
      await labConfigService.createTest(newTest, token);
      setNewTest({ name: "", price: "", unit_id: "", department_id: "" });
      fetchAll();
    } catch (err) {
      console.error("❌ Add test failed:", err);
      alert("Failed to add test.");
    }
  };

  // 🔹 Delete Test
  const handleDeleteClick = async (id) => {
    if (!window.confirm("Are you sure you want to deactivate this test?")) return;
    try {
      await labConfigService.deleteTest(id, token);
      fetchAll();
    } catch (err) {
      console.error("❌ Delete failed:", err);
      alert("Failed to delete test.");
    }
  };

  // ================================================================
  // 🔹 UI RENDERING
  // ================================================================
  if (loading)
    return (
      <div className="p-8 bg-white rounded-lg shadow text-center">
        <p className="text-gray-500 animate-pulse">Loading lab tests...</p>
      </div>
    );

  if (error)
    return (
      <div className="p-6 bg-white rounded-lg shadow text-center">
        <p className="text-red-600 mb-3">{error}</p>
        <button
          onClick={fetchAll}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <h2 className="text-2xl font-semibold">🧾 Test Pricing Management</h2>

        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={currency}
            onChange={handleCurrencyChange}
            className="border rounded px-3 py-1 text-sm"
          >
            <option value="Le">Le (Leone)</option>
            <option value="$">$ (USD)</option>
            <option value="€">€ (Euro)</option>
            <option value="£">£ (GBP)</option>
            <option value="₦">₦ (Naira)</option>
            <option value="₵">₵ (Cedi)</option>
          </select>
          <button
            onClick={fetchAll}
            className="flex items-center gap-1 px-3 py-1 bg-gray-100 border rounded hover:bg-gray-200"
          >
            <HiRefresh /> Refresh
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-wrap gap-3 items-center mb-6 bg-gray-50 p-3 rounded-lg">
        <div className="flex items-center gap-2 flex-grow">
          <HiSearch className="text-gray-400" />
          <input
            type="text"
            placeholder="Search test name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded px-3 py-2 flex-grow"
          />
        </div>

        <div className="flex items-center gap-2">
          <HiFilter className="text-gray-400" />
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm ml-3">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Show inactive
        </label>
      </div>

      {/* Add New Test */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <HiPlus className="text-green-600" /> Add New Test
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Test Name"
            value={newTest.name}
            onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
            className="border rounded px-3 py-2 w-full"
          />
          <input
            type="number"
            placeholder="Price"
            value={newTest.price}
            onChange={(e) => setNewTest({ ...newTest, price: e.target.value })}
            className="border rounded px-3 py-2 w-full"
          />
          <select
            value={newTest.unit_id}
            onChange={(e) =>
              setNewTest({ ...newTest, unit_id: e.target.value })
            }
            className="border rounded px-3 py-2 w-full"
          >
            <option value="">Select Unit</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.symbol} ({u.unit_name})
              </option>
            ))}
          </select>
          <select
            value={newTest.department_id}
            onChange={(e) =>
              setNewTest({ ...newTest, department_id: e.target.value })
            }
            className="border rounded px-3 py-2 w-full"
          >
            <option value="">Select Department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 text-right">
          <button
            onClick={handleAddTest}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Add Test
          </button>
        </div>
      </div>

      {/* Tests Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border rounded-lg">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="p-3 font-semibold">Test Name</th>
              <th className="p-3 font-semibold">Department</th>
              <th className="p-3 font-semibold">Price</th>
              <th className="p-3 font-semibold">Unit</th>
              <th className="p-3 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTests.length ? (
              filteredTests.map((test) => (
                <tr
                  key={test.id}
                  className={`border-b hover:bg-gray-50 ${
                    !test.is_active ? "opacity-60" : ""
                  }`}
                >
                  <td className="p-3">{test.test_name}</td>
                  <td className="p-3">{test.department}</td>
                  <td className="p-3">
                    {editingId === test.id ? (
                      <input
                        type="number"
                        value={currentEdit.price}
                        onChange={(e) =>
                          setCurrentEdit({
                            ...currentEdit,
                            price: e.target.value,
                          })
                        }
                        className="border rounded px-2 py-1 w-24"
                      />
                    ) : (
                      `${currency} ${Number(test.price).toFixed(2)}`
                    )}
                  </td>
                  <td className="p-3">
                    {editingId === test.id ? (
                      <select
                        value={currentEdit.unit_id}
                        onChange={(e) =>
                          setCurrentEdit({
                            ...currentEdit,
                            unit_id: e.target.value,
                          })
                        }
                        className="border rounded px-2 py-1"
                      >
                        <option value="">Select</option>
                        {units.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.symbol} ({u.unit_name})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <>
                        {test.unit_symbol}{" "}
                        <span className="text-gray-400">
                          ({test.unit_name})
                        </span>
                      </>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {editingId === test.id ? (
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleSaveEdit(test.id)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <HiCheck className="w-5 h-5" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="text-red-600 hover:text-red-800"
                        >
                          <HiX className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-center gap-3">
                        <button
                          onClick={() => handleEditClick(test)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <HiPencil />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(test.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <HiTrash />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="5"
                  className="text-center text-gray-500 py-4 italic"
                >
                  No matching tests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BillingManager;
