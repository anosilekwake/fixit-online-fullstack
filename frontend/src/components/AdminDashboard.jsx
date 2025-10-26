import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

/**
 * AdminDashboard
 * - Features:
 *   - status on each submission (Pending / Processing / Completed)
 *   - badge colors: Pending=yellow, Processing=blue, Completed=green
 *   - status filter + search + sort + pagination combined
 *   - inline quick-status-change (optimistic update + backend PUT /api/admin/submissions/:id)
 *   - view/edit/delete, export CSV/JSON
 *   - analytics cards (total, pending, processing, completed)
 *   - auto-logout on 401 Unauthorized
 *   - toasts for success/error
 *
 * Expected backend:
 * GET  /api/admin/submissions
 * PUT  /api/admin/submissions/:id   { ...fields }  (for status updates and edits)
 * DELETE /api/admin/submissions/:id
 */

const STATUS_OPTIONS = ["Pending", "Processing", "Completed"];
const STATUS_BADGE = {
  Pending: "bg-yellow-100 text-yellow-800",
  Processing: "bg-blue-100 text-blue-800",
  Completed: "bg-green-100 text-green-800",
};

// small toast component (no external library)
function Toast({ message, type = "info", onClose }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  const bg =
    type === "success"
      ? "bg-green-600"
      : type === "error"
      ? "bg-red-600"
      : "bg-gray-800";

  return (
    <div className={`fixed bottom-6 right-6 z-50 p-4 rounded shadow text-white ${bg}`}>
      {message}
    </div>
  );
}

export default function AdminDashboard({ token: propToken, onLogout }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date"); // date | name
  const [statusFilter, setStatusFilter] = useState("All"); // All | Pending | Processing | Completed
  const [page, setPage] = useState(1);
  const [perPage] = useState(8);

  // Modals
  const [viewItem, setViewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);

  // Toast
  const [toast, setToast] = useState({ message: "", type: "info" });

  // analytics counts
  const analytics = useMemo(() => {
    const total = submissions.length;
    const pending = submissions.filter((s) => s.status === "Pending").length;
    const processing = submissions.filter((s) => s.status === "Processing").length;
    const completed = submissions.filter((s) => s.status === "Completed").length;
    return { total, pending, processing, completed };
  }, [submissions]);

  const navigate = useNavigate();

  const AUTH_TOKEN = propToken || localStorage.getItem("adminToken");

  // fetch submissions
  useEffect(() => {
    let aborted = false;
    async function fetchSubmissions() {
      setLoading(true);
      setError("");
      try {
        const token = AUTH_TOKEN;
        if (!token) {
          setError("No admin token — please log in.");
          onLogout?.();
          navigate("/admin-login");
          return;
        }

        const res = await fetch("/api/admin/submissions", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          // expired token -> logout
          localStorage.removeItem("adminToken");
          onLogout?.();
          setError("Session expired. Please log in again.");
          navigate("/admin-login");
          return;
        }

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Failed to load submissions.");
        }

        const data = await res.json();
        // ensure each submission has a status
        const normalized = (data.submissions || data || []).map((s) => ({
          status: "Pending",
          ...s,
        }));
        if (!aborted) {
          setSubmissions(normalized);
        }
      } catch (err) {
        if (!aborted) {
          console.error("Error fetching submissions:", err);
          setError(err.message || "Failed to load submissions.");
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    }
    fetchSubmissions();
    return () => {
      aborted = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propToken, onLogout, navigate]);

  // Derived filtered + sorted list
  const filtered = useMemo(() => {
    let list = [...submissions];

    // status filter
    if (statusFilter !== "All") list = list.filter((s) => s.status === statusFilter);

    // search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          (s.name || "").toLowerCase().includes(q) ||
          (s.email || "").toLowerCase().includes(q) ||
          (s.details || "").toLowerCase().includes(q) ||
          (s._id || "").toLowerCase().includes(q)
      );
    }

    // sort
    if (sortBy === "name") {
      list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else {
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    return list;
  }, [submissions, search, sortBy, statusFilter]);

  // pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentData = filtered.slice((page - 1) * perPage, page * perPage);

  useEffect(() => {
    // if filter/search changes, reset to page 1
    setPage(1);
  }, [search, sortBy, statusFilter]);

  // optimistic status update
  const updateStatus = async (id, newStatus) => {
    // optimistic update
    setSubmissions((prev) => prev.map((s) => (s._id === id ? { ...s, status: newStatus } : s)));
    setToast({ message: "Updating status...", type: "info" });

    try {
      const token = localStorage.getItem("adminToken") || AUTH_TOKEN;
      const res = await fetch(`/api/admin/submissions/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.status === 401) {
        // token expired
        localStorage.removeItem("adminToken");
        onLogout?.();
        navigate("/admin-login");
        setToast({ message: "Session expired. Logging out...", type: "error" });
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update status");
      }

      const data = await res.json();
      // update with server response (in case server adds fields)
      setSubmissions((prev) => prev.map((s) => (s._id === id ? { ...s, ...(data.submission || {}) } : s)));
      setToast({ message: "Status updated", type: "success" });
    } catch (err) {
      // rollback: restore previous (brief approach: refetch or simply set back to Pending)
      // For more accuracy, keep previous status in a ref. Simple rollback to Pending if error:
      setSubmissions((prev) => prev.map((s) => (s._id === id ? { ...s, status: "Pending" } : s)));
      console.error("Status update failed:", err);
      setToast({ message: err.message || "Status update failed", type: "error" });
    }
  };

  // delete submission
  const deleteSubmission = async (id) => {
    if (!window.confirm("Are you sure you want to delete this submission?")) return;
    try {
      const token = localStorage.getItem("adminToken") || AUTH_TOKEN;
      const res = await fetch(`/api/admin/submissions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        onLogout?.();
        navigate("/admin-login");
        return;
      }
      if (!res.ok) throw new Error("Failed to delete submission");
      setSubmissions((prev) => prev.filter((s) => s._id !== id));
      setToast({ message: "Submission deleted", type: "success" });
    } catch (err) {
      console.error(err);
      setToast({ message: err.message || "Delete failed", type: "error" });
    }
  };

  // save edits
  const saveEdit = async (item) => {
    try {
      const token = localStorage.getItem("adminToken") || AUTH_TOKEN;
      const res = await fetch(`/api/admin/submissions/${item._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(item),
      });
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        onLogout?.();
        navigate("/admin-login");
        return;
      }
      if (!res.ok) throw new Error("Failed to update submission");

      const data = await res.json();
      setSubmissions((prev) => prev.map((s) => (s._id === item._id ? { ...s, ...(data.submission || item) } : s)));
      setEditItem(null);
      setToast({ message: "Submission updated", type: "success" });
    } catch (err) {
      console.error(err);
      setToast({ message: err.message || "Update failed", type: "error" });
    }
  };

  // exports
  const exportCSV = () => {
    const rows = [
      ["ID", "Name", "Email", "Details", "Status", "Date"],
      ...filtered.map((s) => [
        s._id || "—",
        (s.name || "—").replace(/,/g, " "),
        (s.email || "—").replace(/,/g, " "),
        (s.details || "—").replace(/,/g, " "),
        s.status || "Pending",
        s.createdAt ? new Date(s.createdAt).toLocaleString() : "—",
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `submissions_${Date.now()}.csv`;
    a.click();
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `submissions_${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className={`flex items-center justify-between px-6 py-4 ${"bg-white dark:bg-gray-800 shadow"}`}>
        <div>
          <h1 className="text-xl font-bold">⚙️ Admin Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{analytics.total} submissions</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              localStorage.removeItem("adminToken");
              onLogout?.();
              navigate("/admin-login");
            }}
            className="px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        {/* Analytics cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
            <div className="text-sm text-gray-500">Total</div>
            <div className="text-2xl font-bold">{analytics.total}</div>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
            <div className="text-sm text-gray-500">Pending</div>
            <div className="text-2xl font-bold text-yellow-600">{analytics.pending}</div>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
            <div className="text-sm text-gray-500">Processing</div>
            <div className="text-2xl font-bold text-blue-600">{analytics.processing}</div>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
            <div className="text-sm text-gray-500">Completed</div>
            <div className="text-2xl font-bold text-green-600">{analytics.completed}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search by name / email / id..."
              className="px-4 py-2 border rounded w-full sm:w-80"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-3 py-2 border rounded">
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Name</option>
            </select>
          </div>

          <div className="flex gap-2 items-center">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded">
              <option value="All">All status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <button onClick={exportCSV} className="px-3 py-2 bg-green-500 text-white rounded">Export CSV</button>
            <button onClick={exportJSON} className="px-3 py-2 bg-blue-500 text-white rounded">Export JSON</button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded shadow">
          {loading ? (
            <div className="p-6">⏳ Loading submissions...</div>
          ) : error ? (
            <div className="p-6 text-red-600">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-gray-600">No submissions found.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Details</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((s, i) => (
                  <tr key={s._id || i} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3">{(page - 1) * perPage + i + 1}</td>
                    <td className="px-4 py-3">{s.name || "—"}</td>
                    <td className="px-4 py-3">{s.email || "—"}</td>
                    <td className="px-4 py-3 max-w-xs truncate">{s.details || "—"}</td>
                    <td className="px-4 py-3">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs ${STATUS_BADGE[s.status || "Pending"]}`}>
                        <span className="font-semibold">{s.status || "Pending"}</span>
                      </div>

                      {/* inline quick status change */}
                      <div className="mt-2">
                        <select
                          value={s.status || "Pending"}
                          onChange={(e) => updateStatus(s._id, e.target.value)}
                          className="mt-1 px-2 py-1 border rounded text-sm"
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-3">{s.createdAt ? new Date(s.createdAt).toLocaleString() : "—"}</td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => setViewItem(s)} className="px-2 py-1 bg-blue-500 text-white rounded text-xs">View</button>
                      <button onClick={() => setEditItem(s)} className="px-2 py-1 bg-yellow-500 text-white rounded text-xs">Edit</button>
                      <button onClick={() => deleteSubmission(s._id)} className="px-2 py-1 bg-red-500 text-white rounded text-xs">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* pagination */}
        <div className="flex justify-between items-center mt-4">
          <div>Page {page} of {totalPages}</div>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
          </div>
        </div>
      </main>

      {/* view modal */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="bg-white dark:bg-gray-800 rounded p-6 max-w-xl w-full">
            <div className="flex justify-between items-start">
              <h2 className="text-lg font-bold">Submission Details</h2>
              <button onClick={() => setViewItem(null)} className="text-gray-500">Close</button>
            </div>
            <div className="mt-3 space-y-2">
              <div><strong>ID:</strong> {viewItem._id}</div>
              <div><strong>Name:</strong> {viewItem.name || "—"}</div>
              <div><strong>Email:</strong> {viewItem.email || "—"}</div>
              <div><strong>Status:</strong> <span className={`px-2 py-1 rounded ${STATUS_BADGE[viewItem.status || "Pending"]}`}>{viewItem.status || "Pending"}</span></div>
              <div className="mt-2"><strong>Details:</strong>
                <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded whitespace-pre-wrap">{viewItem.details || "—"}</div>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setViewItem(null)} className="px-4 py-2 bg-blue-500 text-white rounded">Close</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* edit modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white dark:bg-gray-800 rounded p-6 max-w-md w-full">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Edit Submission</h2>
              <button onClick={() => setEditItem(null)} className="text-gray-500">X</button>
            </div>
            <div className="mt-3 space-y-2">
              <input value={editItem.name || ""} onChange={(e) => setEditItem((p) => ({ ...p, name: e.target.value }))} className="w-full p-2 border rounded" />
              <input value={editItem.email || ""} onChange={(e) => setEditItem((p) => ({ ...p, email: e.target.value }))} className="w-full p-2 border rounded" />
              <textarea value={editItem.details || ""} onChange={(e) => setEditItem((p) => ({ ...p, details: e.target.value }))} className="w-full p-2 border rounded" rows={4} />
              <select value={editItem.status || "Pending"} onChange={(e) => setEditItem((p) => ({ ...p, status: e.target.value }))} className="w-full p-2 border rounded">
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button onClick={() => saveEdit(editItem)} className="px-4 py-2 bg-green-600 text-white rounded">Save</button>
              <button onClick={() => setEditItem(null)} className="px-4 py-2 bg-gray-500 text-white rounded">Cancel</button>
            </div>
          </motion.div>
        </div>
      )}

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "info" })} />
    </div>
  );
}
