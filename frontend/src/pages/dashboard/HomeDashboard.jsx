import React, { useMemo } from "react";
import DepartmentTile from "../components/dashboard/DepartmentTile";
import { useAuth } from "../context/AuthContext";

// Icon Set A (lucide-react)
import {
  UserPlus, // Reception
  Syringe,  // Phlebotomy
  FlaskConical, // Laboratory
  Microscope, // Microbiology
  TestTube, // Chemistry
  Droplets, // Hematology
  Stamp,   // Pathology
  ShieldCheck, // Admin
} from "lucide-react";

/** Permission helper */
const canAny = (can, checks = []) => checks.some(([res, act]) => can(res, act));

export default function HomeDashboard() {
  const { user, can, loading } = useAuth();

  const tiles = useMemo(() => {
    return [
      {
        key: "reception",
        title: "Reception",
        desc: "Patient registration & sample intake",
        to: "/reception",
        icon: UserPlus,
        show: canAny(can, [
          ["patients", "create"],
          ["samples", "receive"],
        ]),
      },
      {
        key: "phlebotomy",
        title: "Phlebotomy",
        desc: "Collection queue & tube scan",
        to: "/phlebotomy",
        icon: Syringe,
        show: can("phlebotomy", "collect"),
      },
      {
        key: "hematology",
        title: "Hematology",
        desc: "CBC & differential worklist",
        to: "/lab/hematology",
        icon: Droplets,
        show: canAny(can, [["tests", "work"], ["hematology", "work"]]),
      },
      {
        key: "chemistry",
        title: "Chemistry",
        desc: "Panels & analytes processing",
        to: "/lab/chemistry",
        icon: TestTube,
        show: canAny(can, [["tests", "work"], ["chemistry", "work"]]),
      },
      {
        key: "microbiology",
        title: "Microbiology",
        desc: "Cultures, sensitivities, reports",
        to: "/lab/microbiology",
        icon: Microscope,
        show: canAny(can, [["tests", "work"], ["microbiology", "work"]]),
      },
      {
        key: "pathology",
        title: "Pathology",
        desc: "Case review & approvals",
        to: "/pathology",
        icon: Stamp,
        show: canAny(can, [
          ["results", "approve"],
          ["pathology", "review"],
        ]),
      },
      {
        key: "laboratory",
        title: "Laboratory",
        desc: "Departmental queues & tasks",
        to: "/lab",
        icon: FlaskConical,
        show: can("tests", "work"),
      },
      {
        key: "admin",
        title: "Admin / Management",
        desc: "Users, roles, catalog, reports",
        to: "/admin",
        icon: ShieldCheck,
        // wildcard or elevated gets through automatically
        show:
          (user?.permissions_map && user.permissions_map["*:*"]) ||
          user?.role_id === 1 ||
          user?.role_id === 2 ||
          canAny(can, [
            ["admin", "view"],
            ["users", "manage"],
            ["roles", "manage"],
            ["catalog", "manage"],
          ]),
      },
    ].filter((t) => t.show);
  }, [user, can]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-4 h-6 w-48 rounded bg-slate-200 animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl border bg-white shadow-sm animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header: HC-3 look */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Welcome</h1>
          <p className="text-sm text-slate-500">
            Choose a workspace to get started.
          </p>
        </div>
        {user && (
          <div className="rounded-xl border bg-teal-50 text-teal-700 px-3 py-1 text-sm">
            <span className="font-medium">{user.full_name}</span>{" "}
            · {user.role_name || (user.roles?.[0] ?? "User")}
          </div>
        )}
      </div>

      {/* Tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tiles.map((t) => (
          <DepartmentTile key={t.key} {...t} />
        ))}
      </div>
    </div>
  );
}
