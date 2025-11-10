import React, { useState, useEffect } from "react";
import { X, Search, User } from "lucide-react";
import patientService from "../../services/patientService";

const PatientSearchModal = ({ isOpen, onClose, onSelect }) => {
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ Auto-Focus on Input When Modal Opens
  const inputRef = React.useRef(null);
  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  // ✅ Debounced search (Auto Search)
  useEffect(() => {
    if (!isOpen) return;
    if (query.trim().length < 2) {
      setPatients([]);
      return;
    }

    const delay = setTimeout(async () => {
      try {
        setLoading(true);
        const token = JSON.parse(localStorage.getItem("userInfo"))?.token;
        const results = await patientService.searchPatients(query, token);
        setPatients(results || []);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    }, 300); // <--- 300ms debounce

    return () => clearTimeout(delay);
  }, [query, isOpen]);

  // ✅ Manual submit (Enter key)
  const handleKeyUp = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setQuery(query); // triggers debounce immediately
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-white w-full max-w-3xl rounded-lg shadow-xl p-6 animate-fadeIn">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Search Patient</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={22} />
          </button>
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2 mb-4">
          <input
            ref={inputRef}
            type="text"
            className="w-full border px-3 py-2 rounded-lg focus:ring focus:ring-blue-200"
            placeholder="Search by name, phone or patient ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyUp={handleKeyUp}
          />
          <Search size={20} className="text-gray-400" />
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto border rounded-lg">
          {loading ? (
            <div className="p-6 text-center text-blue-600 animate-pulse">
              Searching...
            </div>
          ) : patients.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No patients found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Age</th>
                  <th className="p-3 text-left">Phone</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={p.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 flex gap-2 items-center">
                      <User size={15} className="text-blue-500" />
                      {p.full_name}
                    </td>
                    <td className="p-3">{p.age || "—"}</td>
                    <td className="p-3">{p.phone || "—"}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => onSelect(p)}
                        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientSearchModal;
