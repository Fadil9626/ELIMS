// frontend/src/utils/statusBadge.js

export function getStatusBadge(status) {
  switch (status) {
    case "billing_pending":
      return { label: "Billing Pending", color: "bg-yellow-200 text-yellow-800" };
    case "sample_pending":
      return { label: "Awaiting Sample", color: "bg-blue-200 text-blue-800" };
    case "processing":
      return { label: "Processing", color: "bg-purple-200 text-purple-800" };
    case "completed":
      return { label: "Completed", color: "bg-green-200 text-green-800" };
    case "cancelled":
      return { label: "Cancelled", color: "bg-red-200 text-red-800" };
    default:
      return { label: status || "Unknown", color: "bg-gray-200 text-gray-700" };
  }
}

export function getNextStatus(status) {
  const mapping = {
    billing_pending: "sample_pending",
    sample_pending: "processing",
    processing: "completed",
    completed: null,
    cancelled: null,
  };
  return mapping[status] ?? null;
}
