import { statusLabels } from "../utils/statusLabels";

const statusColors = {
  Pending: "bg-gray-200 text-gray-700",
  SampleCollected: "bg-blue-200 text-blue-800",
  InProgress: "bg-yellow-200 text-yellow-800",
  Completed: "bg-cyan-200 text-cyan-800",
  UnderReview: "bg-purple-200 text-purple-800",
  Verified: "bg-green-200 text-green-800",
  Released: "bg-emerald-200 text-emerald-900",
  Reopened: "bg-red-200 text-red-800",
  Cancelled: "bg-red-300 text-red-900",
  Rejected: "bg-rose-300 text-rose-900",
};

export default function StatusBadge({ status }) {
  const label = statusLabels[status] || status;
  const colorClass = statusColors[status] || "bg-gray-200 text-gray-700";

  return (
    <span className={`px-2 py-1 text-xs rounded-full font-medium ${colorClass}`}>
      {label}
    </span>
  );
}
