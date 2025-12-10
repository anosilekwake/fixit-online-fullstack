export default function UsersTable({ token, onLogout }) {
  // ... existing code

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-blue-600">Client Submissions</h1>
        <button
          onClick={onLogout}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Logout
        </button>
      </div>
      {/* table code unchanged */}
    </div>
  );
}
