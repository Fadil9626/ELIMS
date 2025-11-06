exports.parseHL7 = (text) => {
    // Split to segments, find OBX. Real-world: use a full HL7 lib later.
    const lines = text.split(/\r?\n/).filter(Boolean);
    const obx = [];
    const meta = {};
    for (const ln of lines) {
      const [seg, ...rest] = ln.split("|");
      if (seg === "MSH") {
        meta.msh = ln;
      } else if (seg === "OBX") {
        const idField = rest[2] || "";          // OBX-3
        const valueField = rest[4] || "";       // OBX-5
        const unitField = rest[5] || "";        // OBX-6
        const idParts = idField.split("^");
        const name = idParts[1] || idParts[0];  // take text if present
        obx.push({ id: name, value: valueField, unit: unitField });
      }
    }
    return { obx, meta };
  };
  