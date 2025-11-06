export async function uploadImport(
    token: string,
    files: { tests?: File; ranges?: File },
    department?: string
  ) {
    const form = new FormData();
    if (files.tests) form.append("tests", files.tests);
    if (files.ranges) form.append("ranges", files.ranges);
  
    const url = department ? `/api/import/${encodeURIComponent(department)}` : `/api/import`;
  
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form, // don't set Content-Type manually
    });
  
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.message || res.statusText || "Upload failed";
      throw new Error(msg);
    }
    return data;
  }
  