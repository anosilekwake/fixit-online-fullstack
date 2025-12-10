import { useEffect, useState } from "react";
import { fetchSubmissions } from "../api/adminApi";
import { useNavigate } from "react-router-dom";

export default function AdminPanel() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const token = localStorage.getItem("adminToken");

  useEffect(() => {
    if (!token) {
      navigate("/admin-login");
      return;
    }

    async function loadData() {
      try {
        const data = await fetchSubmissions(token);
        setSubmissions(data);
      } catch (err) {
        setError("Session expired, please log in again");
        localStorage.removeItem("adminToken");
        navigate("/admin-login");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [token, navigate]);

  if (loading) return <p className="p-4">Loading...</p>;
  if (error) return <p className="p-4 text-red-500">{error}</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">📋 Client Submissions</h1>
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2">ID</th>
            <th className="border p-2">Name</th>
            <th className="border p-2">Email</th>
            <th className="border p-2">Message</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((s) => (
            <tr key={s.id} className="hover:bg-gray-50">
              <td className="border p-2">{s.id}</td>
              <td className="border p-2">{s.name}</td>
              <td className="border p-2">{s.email}</td>
              <td className="border p-2">{s.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
