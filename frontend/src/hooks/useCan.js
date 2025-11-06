// src/hooks/useCan.js
import { useCallback, useEffect, useMemo, useState } from "react";
import { deriveMe, canPerm, readSession } from "../utils/perm";

export default function useCan() {
  const [state, setState] = useState(() => deriveMe());

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "userInfo") setState(deriveMe());
    };
    const onMeUpdated = () => setState(deriveMe());

    window.addEventListener("storage", onStorage);
    window.addEventListener("me:updated", onMeUpdated);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("me:updated", onMeUpdated);
    };
  }, []);

  // Self-heal: if token exists but me is empty, fetch /api/me once
  useEffect(() => {
    const info = readSession();
    const token = info?.token || info?.user?.token;

    const alreadyGood =
      state.isElevated ||
      state.eff?.__all === true ||
      state.perms?.__all === true ||
      (Array.isArray(state.slugs) && state.slugs.includes("*")) ||
      state.map?.["*:*"] === true;

    const looksEmpty =
      !state.me ||
      (!state.me.role_id &&
        !state.me.effective_permissions &&
        !state.me.permissions &&
        !state.me.permission_slugs);

    if (!token || alreadyGood || !looksEmpty) return;

    (async () => {
      try {
        const resp = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) return;
        const me = await resp.json();
        localStorage.setItem("userInfo", JSON.stringify({ ...info, me }));
        window.dispatchEvent(new Event("me:updated"));
      } catch {
        // ignore
      }
    })();
  }, [state]);

  const can = useCallback((module, action = "view") => canPerm(state, module, action), [state]);

  return useMemo(
    () => ({
      can,
      isElevated: state.isElevated,
      me: state.me,
      roleId: state.roleId,
      roleName: state.roleName,
      raw: {
        eff: state.eff,
        perms: state.perms,
        slugs: state.slugs,
        map: state.map,
      },
    }),
    [can, state]
  );
}
