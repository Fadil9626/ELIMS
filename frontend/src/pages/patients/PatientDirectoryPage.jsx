import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiUser, FiEdit2, FiTrash2, FiFileText, FiPrinter } from "react-icons/fi";
import { toast } from "react-hot-toast";
import patientService from "../../services/patientService";
import testRequestService from "../../services/testRequestService";

const calculateAge = (dob) => {
  if (!dob) return "N/A";
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return "N/A";
  const t = new Date();
  let age = t.getFullYear() - d.getFullYear();
  const m = t.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) age--;
  return age;
};

const getStatusClass = (status) => {
  switch (status) {
    case "Pending":
      return "bg-gray-100 text-gray-800 border border-gray-200";
    case "Awaiting Payment":
      return "bg-yellow-100 text-yellow-800 border border-yellow-200";
    case "Paid":
      return "bg-green-100 text-green-800 border border-green-200";
    case "Awaiting Sample Collection":
      return "bg-blue-100 text-blue-800 border border-blue-200";
    case "In Progress":
      return "bg-cyan-100 text-cyan-800 border border-cyan-200";
    case "Completed":
      return "bg-emerald-100 text-emerald-900 border border-emerald-200";
    default:
      return "bg-gray-100 text-gray-600 border border-gray-200";
  }
};

const PatientDirectoryPage = () => {
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [paymentData, setPaymentData] = useState({ amount: "", paymentMethod: "", items: [] });
  const [receiptData, setReceiptData] = useState(null);
  const [calculatingTotal, setCalculatingTotal] = useState(false);

  const navigate = useNavigate();
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));
  const token = userInfo?.token;
  const userRole = userInfo?.user?.role_id ?? userInfo?.role_id ?? 0;

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const data = await patientService.getAllPatients(token);
        setPatients(data);
      } catch {
        toast.error("Failed to load patients.");
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, [token]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this patient?")) return;
    try {
      await patientService.deletePatient(id, token);
      setPatients((prev) => prev.filter((p) => p.id !== id));
      toast.success("Patient deleted successfully.");
    } catch {
      toast.error("Failed to delete patient.");
    }
  };

  const openPaymentFor = async (patient) => {
    const requestId = patient.latest_request_id || patient.request_id;
    if (!requestId) return toast.error("No linked test request found.");

    try {
      setCalculatingTotal(true);
      const reqDetails = await testRequestService.getTestRequestById(requestId, token);
      const total = (reqDetails.items || []).reduce(
        (sum, item) => sum + (Number(item.price) || 0),
        0
      );
      setSelectedPatient(patient);
      setPaymentData({
        amount: total.toFixed(2),
        paymentMethod: "",
        items: reqDetails.items || [],
      });
      setIsPaymentModalOpen(true);
    } catch (e) {
      toast.error(e.message || "Could not fetch test total.");
    } finally {
      setCalculatingTotal(false);
    }
  };

  const handleStatusChange = async (patient, newStatus) => {
    const requestId = patient.latest_request_id || patient.request_id;
    if (!requestId) return toast.error("No linked test request found.");

    if (newStatus === "Paid") {
      return openPaymentFor(patient);
    }

    try {
      await testRequestService.updateTestRequestStatus(requestId, newStatus, token);
      setPatients((prev) =>
        prev.map((p) =>
          p.id === patient.id ? { ...p, latest_request_status: newStatus } : p
        )
      );
      toast.success(`Status updated to ${newStatus}`);
    } catch (e) {
      toast.error(e.message || "Failed to update status.");
    }
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    const requestId = selectedPatient?.latest_request_id || selectedPatient?.request_id;
    if (!requestId) return toast.error("No linked test request found.");
    if (!paymentData.paymentMethod) return toast.error("Please select a payment method.");

    try {
      const resp = await testRequestService.processPayment(
        requestId,
        {
          amount: parseFloat(paymentData.amount),
          paymentMethod: paymentData.paymentMethod,
        },
        token
      );

      const now = new Date();
      const receiptInfo = {
        patient: selectedPatient,
        items: paymentData.items,
        total: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        paymentDate: now.toLocaleString(),
        reference: `INV-${requestId}-${now.getTime()}`,
      };
      setReceiptData(receiptInfo);
      setIsReceiptModalOpen(true);

      setPatients((prev) =>
        prev.map((p) =>
          p.id === selectedPatient.id
            ? {
                ...p,
                payment_status: "Paid",
                latest_request_payment_status: "Paid",
                latest_request_status: "Awaiting Sample Collection",
              }
            : p
        )
      );

      toast.success(resp?.message || "Payment processed successfully!");
      setIsPaymentModalOpen(false);
      setSelectedPatient(null);
      setPaymentData({ amount: "", paymentMethod: "", items: [] });
    } catch (e) {
      toast.error(e.message || "Payment failed.");
    }
  };

  const filteredPatients = patients.filter((p) => {
    const fullName = `${p.first_name ?? ""} ${p.last_name ?? ""}`.toLowerCase();
    return (
      fullName.includes(searchTerm.toLowerCase()) ||
      p.lab_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  if (loading) return <div className="p-6 text-gray-600">Loading patients...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Patient Directory</h1>
        <div className="flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
          >
            ← Back
          </button>
          <button
            onClick={() => navigate("/patients/register")}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2"
          >
            <FiUser /> Add Patient
          </button>
        </div>
      </div>

      <div className="mb-6 bg-white shadow-sm rounded-md border p-2 flex items-center">
        <input
          type="text"
          placeholder="Search by name or Lab ID..."
          className="flex-1 p-2 outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100 border-b text-gray-700">
            <tr>
              <th className="p-4">Lab ID</th>
              <th className="p-4">Patient</th>
              <th className="p-4">Age</th>
              <th className="p-4">Ward</th>
              <th className="p-4">Workflow Status</th>
              <th className="p-4">Payment</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.length > 0 ? (
              filteredPatients.map((p) => {
                const ageDisplay = p.age ?? calculateAge(p.date_of_birth || p.dob);
                const paid =
                  String(p.payment_status || p.latest_request_payment_status) === "Paid";
                return (
                  <tr key={p.id} className="border-b hover:bg-gray-50 transition">
                    <td className="p-4 font-mono">{p.lab_id || "-"}</td>
                    <td className="p-4 flex items-center gap-2">
                      <FiUser className="text-blue-500" />
                      <Link to={`/patients/${p.id}`} className="text-blue-700 hover:underline">
                        {p.first_name} {p.last_name}
                      </Link>
                    </td>
                    <td className="p-4">{ageDisplay}</td>
                    <td className="p-4">{p.ward_name || "N/A"}</td>

                    <td className="p-4">
                      {[1, 2].includes(Number(userRole)) ? (
                        <select
                          value={p.latest_request_status || "Pending"}
                          onChange={(e) => handleStatusChange(p, e.target.value)}
                          disabled={paid}
                          className={`text-sm font-semibold rounded-md border px-2 py-1 ${getStatusClass(
                            p.latest_request_status
                          )} ${paid ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Awaiting Payment">Awaiting Payment</option>
                          <option value="Paid">Paid</option>
                          <option value="Awaiting Sample Collection">
                            Awaiting Sample Collection
                          </option>
                        </select>
                      ) : (
                        <span
                          className={`px-2 py-1 text-sm font-semibold rounded-md ${getStatusClass(
                            p.latest_request_status
                          )}`}
                        >
                          {p.latest_request_status || "N/A"}
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      {paid ? (
                        <span className="px-2 py-1 text-sm font-semibold rounded-md bg-green-100 text-green-800 border border-green-200">
                          Paid
                        </span>
                      ) : (
                        <button
                          onClick={() => openPaymentFor(p)}
                          className="px-2 py-1 text-sm font-semibold rounded-md bg-rose-100 text-rose-800 border border-rose-200 hover:bg-rose-200"
                        >
                          Unpaid
                        </button>
                      )}
                    </td>

                    <td className="p-4 text-right flex justify-end gap-2">
                      <Link to={`/patients/${p.id}/edit`}>
                        <button className="p-2 bg-yellow-100 hover:bg-yellow-200 rounded-md">
                          <FiEdit2 className="text-yellow-700" />
                        </button>
                      </Link>

                      {(p.latest_request_status || p.request_id) && (
                        <Link
                          to={`/invoices/test-request/${p.latest_request_id || p.request_id}`}
                        >
                          <button className="p-2 bg-blue-100 hover:bg-blue-200 rounded-md">
                            <FiFileText className="text-blue-700" />
                          </button>
                        </Link>
                      )}

                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-2 bg-red-100 hover:bg-red-200 rounded-md"
                      >
                        <FiTrash2 className="text-red-700" />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" className="p-6 text-center text-gray-500 italic">
                  No patients found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 💳 Payment Modal */}
      {isPaymentModalOpen && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-[420px] max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              Payment for {selectedPatient.first_name} {selectedPatient.last_name}
            </h2>

            {calculatingTotal ? (
              <p className="text-gray-500 text-center">Loading itemized total...</p>
            ) : (
              <form onSubmit={handleProcessPayment} className="space-y-4">
                {/* 🧾 Itemized Breakdown */}
                {paymentData.items && paymentData.items.length > 0 && (
                  <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
                    <h4 className="font-semibold mb-2 text-gray-700">Tests Summary</h4>
                    <ul className="divide-y divide-gray-200">
                      {paymentData.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex justify-between py-1 text-sm text-gray-700"
                        >
                          <span>{item.test_name}</span>
                          <span>{Number(item.price || 0).toLocaleString()} Le</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 flex justify-between font-bold text-gray-800">
                      <span>Total:</span>
                      <span>{Number(paymentData.amount || 0).toLocaleString()} Le</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Amount (Le)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentData.amount}
                    onChange={(e) =>
                      setPaymentData({ ...paymentData, amount: e.target.value })
                    }
                    required
                    className="w-full mt-1 border border-gray-300 rounded-md p-2 bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Payment Method
                  </label>
                  <select
                    value={paymentData.paymentMethod}
                    onChange={(e) =>
                      setPaymentData({ ...paymentData, paymentMethod: e.target.value })
                    }
                    required
                    className="w-full mt-1 border border-gray-300 rounded-md p-2"
                  >
                    <option value="">Select...</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Mobile Money">Mobile Money</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPaymentModalOpen(false);
                      setSelectedPatient(null);
                      setPaymentData({ amount: "", paymentMethod: "", items: [] });
                    }}
                    className="bg-gray-300 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                  >
                    Confirm Payment
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 🧾 Receipt Modal */}
      {isReceiptModalOpen && receiptData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 print:bg-white">
          <div
            id="receipt"
            className="bg-white p-6 rounded-lg shadow-lg w-[500px] max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-2xl font-bold text-center mb-2">Payment Receipt</h2>
            <p className="text-center text-gray-500 mb-4">
              Reference: <strong>{receiptData.reference}</strong>
            </p>
            <div className="mb-3 text-sm text-gray-700">
              <p>
                <strong>Patient:</strong> {receiptData.patient.first_name}{" "}
                {receiptData.patient.last_name}
              </p>
              <p>
                <strong>Date:</strong> {receiptData.paymentDate}
              </p>
              <p>
                <strong>Payment Method:</strong> {receiptData.paymentMethod}
              </p>
            </div>

            <table className="w-full text-sm border border-gray-200 mb-3">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="p-2 text-left">Test</th>
                  <th className="p-2 text-right">Price (Le)</th>
                </tr>
              </thead>
              <tbody>
```jsx
              {receiptData.items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="p-2">{item.test_name}</td>
                  <td className="p-2 text-right">{Number(item.price).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold bg-gray-50">
                <td className="p-2 text-left">Total</td>
                <td className="p-2 text-right">
                  {Number(receiptData.total).toLocaleString()} Le
                </td>
              </tr>
            </tfoot>
          </table>

          <p className="text-center text-gray-500 text-sm">
            Thank you for your payment!
          </p>

          <div className="flex justify-end mt-4 gap-2 no-print">
            <button
              onClick={() => window.print()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <FiPrinter /> Print
            </button>
            <button
              onClick={() => {
                setIsReceiptModalOpen(false);
                setReceiptData(null);
              }}
              className="bg-gray-400 text-white px-4 py-2 rounded-md hover:bg-gray-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default PatientDirectoryPage;
