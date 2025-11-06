import React from "react";
import { deriveMe, canPerm } from "../../utils/perm";

const AccessDenied = () => (
  <div className="flex flex-col items-center justify-center h-full py-20">
    <div className="text-6xl mb-4">❗</div>
    <h2 className="text-3xl font-bold mb-2">Access Denied</h2>
    <p className="text-gray-600">You don't have permission to view this page.</p>
    <a href="/" className="mt-6 inline-block bg-blue-600 text-white px-4 py-2 rounded">
      Go Back to Dashboard
    </a>
  </div>
);

export default function RequirePermission({ module, action = "view", children }) {
  // read the current /api/me snapshot
  const meObj = deriveMe();

  // optional dev override
  const forceAll = localStorage.getItem("FORCE_ALL_NAV") === "1";

  // use the shared checker from utils/perm
  const allowed = forceAll || canPerm(meObj, module, action);

  return allowed ? <>{children}</> : <AccessDenied />;
}
