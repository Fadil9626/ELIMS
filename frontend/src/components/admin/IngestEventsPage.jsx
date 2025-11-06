import React, { useEffect, useMemo, useState } from "react";
import ingestSvc from "../../services/ingestEventsService";
import { HiSearch, HiRefresh, HiEye, HiX } from "react-icons/hi";
import { motion, AnimatePresence } from "framer-motion";

const StatusBadge = ({ s }) => {
  const map = {
    received: "bg-blue-50 text-blue-700 ring-blue-200/70",
    queued: "bg-amber-50 text-amber-700 ring-amber-200/70",
    processed: "bg-green-50 text-green-700 ring-green-200/70",
    ignored: "bg-gray-100 text-gray-700 ring-gray-200/70",
    error: "bg-red-50 text-red-700 ring-red-200/70",
  };
  return (
    <span className={`px-2.5 py-1 text-xs rounded-full ring-1 ${map[s] || "bg-gray-100 text-gray-700 ring-gray-200/70"}`}>
      {s || "—"}
    </span>
  );
};

const Row = ({ ev, onView }) => (
  <tr className="border-b last:border-0">
    <td className="py-2 px-3 font-mono text-xs text-gray-700">{ev.id}</td>
    <td className="py-2 px-3">{new Date(ev.received_at).toLocaleString()}</td>
    <td className="py-2 px-3"><StatusBadge s={ev.status} /></td>
    <td className="py-2 px-3">{ev.instrument || "—"}</td>
    <td className="py-2 px-3 font-mono text-xs">{ev.sample_id || "—"}</td>
    <td className="py-2 px-3 font-mono text-xs">{ev.key_prefix || "—"}</td>
    <td className="py-2 px-3 text-sm">{ev.user_name || `User #${ev.user_id}`}</td>
    <td className="py-2 px-3 text-right">
      <button
        onClick={() => onView(ev.id)}
        className="inline-flex items-center gap-1 px-2 py-1 text-sm rounded-md bg-gray-100 hover:bg-gray-200"
      >
        <HiEye className="h-4 w-4" /> View
      </button>
    </td>
  </tr>
);

const Drawer = ({ open, event, onClose }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "tween", duration: 0.25 }}
        className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl ring-1 ring-black/5 z-50"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="text-lg font-semibold">Event #{event?.id}</h3>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">
            <HiX className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto h-full">
          {!event ? (
            <p>Loading…</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Received:</strong> {new Date(event.received_at).toLocaleString()}</div>
                <div><strong>Status:</strong> <StatusBadge s={event.status} /></div>
                <div><strong>Key Prefix:</strong> <span className="font-mono">{event.key_prefix}</span></div>
                <div><strong>By:</strong> {event.user_name || `User #${event.user_id}`}</div>
              </div>

              {event.error_msg && (
                <div className="rounded-md bg-red-50 text-red-800 border border-red-200 px-3 py-2 text-sm">
                  <strong>Error:</strong> {event.error_msg}
                </div>
              )}

              <div>
                <h4 className="font-semibold mb-2">Result (flattened)</h4>
                {event.result_kv?.length ? (
                  <div className="rounded border">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Code</th>
                          <th className="px-3 py-2 text-left">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {event.result_kv.map((r, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-3 py-2 font-mono">{r.code}</td>
                            <td className="px-3 py-2">{String(r.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">No simple result kv found.</p>
                )}
              </div>

              <div>
                <h4 className="font-semibold mb-2">Raw Payload</h4>
                <pre className="text-xs bg-gray-900 text-gray-100 rounded p-3 overflow-auto">
                  {JSON.stringify(event.payload, null, 2)}
                </pre>
              </div>
            </>
          )}
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

const IngestEventsPage = () => {
  const [filters, setFilters] = useState({ q: "", status: "", instrument: "", from: "", to: "" });
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailId, setDetailId] = useState(null);

  const token = useMemo(() => JSON.parse(localStorage.getItem("userInfo") || "{}")?.token, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await ingestSvc.listIngestEvents({ ...filters, limit, offset }, token);
      setRows(data.rows || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [limit, offset]);

  const onSearch = (e) => {
    e.preventDefault();
    setOffset(0);
    load();
  };

  const openDetail = async (id) => {
    setDrawerOpen(true);
    setDetail(null);
    setDetailId(id);
    try {
      const d = await ingestSvc.getIngestEvent(id, token);
      setDetail(d);
    } catch (e) {
      alert(e.message || "Failed to load event");
    }
  };

  const pages = Math.ceil(total / limit) || 1;
  const page = Math.floor(offset / limit) + 1;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-3">Instrument Ingest Events</h1>
      <p className="text-gray-600 mb-4">View and debug incoming results from analyzers.</p>

      <form onSubmit={onSearch} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end bg-white rounded-xl p-4 ring-1 ring-gray-200">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Search (sample id / key prefix)</label>
          <input className="w-full rounded-md border-gray-300 px-3 py-2" value={filters.q}
            onChange={e => setFilters({ ...filters, q: e.target.value })} placeholder="ABC123 / sk_test_..." />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Status</label>
          <select className="w-full rounded-md border-gray-300 px-3 py-2" value={filters.status}
            onChange={e => setFilters({ ...filters, status: e.target.value })}>
            <option value="">Any</option>
            <option value="received">received</option>
            <option value="queued">queued</option>
            <option value="processed">processed</option>
            <option value="ignored">ignored</option>
            <option value="error">error</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Instrument</label>
          <input className="w-full rounded-md border-gray-300 px-3 py-2" value={filters.instrument}
            onChange={e => setFilters({ ...filters, instrument: e.target.value })} placeholder="BS240" />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">From</label>
          <input type="datetime-local" className="w-full rounded-md border-gray-300 px-3 py-2"
            value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">To</label>
          <input type="datetime-local" className="w-full rounded-md border-gray-300 px-3 py-2"
            value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} />
        </div>

        <div className="md:col-span-5 flex items-center gap-2 justify-end">
          <button type="button" onClick={() => { setFilters({ q: "", status: "", instrument: "", from: "", to: "" }); setOffset(0); load(); }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200">
            <HiRefresh className="h-4 w-4" /> Reset
          </button>
          <button type="submit"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">
            <HiSearch className="h-4 w-4" /> Search
          </button>
        </div>
      </form>

      <div className="mt-4 bg-white rounded-xl ring-1 ring-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2">ID</th>
                <th className="text-left px-3 py-2">Received</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Instrument</th>
                <th className="text-left px-3 py-2">Sample ID</th>
                <th className="text-left px-3 py-2">Key Prefix</th>
                <th className="text-left px-3 py-2">By</th>
                <th className="text-right px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" className="px-3 py-6 text-center text-gray-500">Loading…</td></tr>
              ) : rows.length ? (
                rows.map((ev) => <Row key={ev.id} ev={ev} onView={openDetail} />)
              ) : (
                <tr><td colSpan="8" className="px-3 py-6 text-center text-gray-500">No events found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
          <div className="text-xs text-gray-600">
            Showing {rows.length ? offset + 1 : 0}–{offset + rows.length} of {total}
          </div>
          <div className="flex items-center gap-2">
            <select
              className="border rounded px-2 py-1 text-sm"
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setOffset(0); }}>
              {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
            </select>
            <button disabled={page <= 1}
              onClick={() => setOffset(Math.max(0, offset - limit))}
              className="px-2 py-1 border rounded disabled:opacity-50">Prev</button>
            <span className="text-sm">Page {page} / {pages}</span>
            <button disabled={page >= pages}
              onClick={() => setOffset(offset + limit)}
              className="px-2 py-1 border rounded disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      <Drawer open={drawerOpen} event={detail} onClose={() => setDrawerOpen(false)} />
    </div>
  );
};

export default IngestEventsPage;
