import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function CreateSession() {
  const [form, setForm] = useState({
    topic: "",
    scheduledTime: "",
    aiCount: 1,
    humanCount: 1,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "aiCount" || name === "humanCount" ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const res = await axios.post("http://localhost:5000/api/gd/create", form, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
    navigate("/dashboard", {
  state: { message: "Session created successfully!" },
});

    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded-xl shadow-md w-full max-w-lg">
        <h2 className="text-3xl font-bold mb-6 text-center">Schedule GD / Interview</h2>

        <input
          name="topic"
          type="text"
          placeholder="Enter GD Topic"
          value={form.topic}
          onChange={handleChange}
          required
          className="w-full mb-4 p-3 rounded bg-gray-700 text-white outline-none focus:ring-2 focus:ring-purple-500"
        />

        <input
          name="scheduledTime"
          type="datetime-local"
          value={form.scheduledTime}
          onChange={handleChange}
          required
          className="w-full mb-4 p-3 rounded bg-gray-700 text-white outline-none focus:ring-2 focus:ring-purple-500"
        />

        <div className="flex gap-4 mb-4">
          <div className="w-1/2">
            <label className="block mb-1 text-purple-300">AI Participants</label>
            <select
              name="aiCount"
              value={form.aiCount}
              onChange={handleChange}
              className="w-full p-2 rounded bg-gray-700"
            >
              {[1, 2, 3, 4].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </div>

          <div className="w-1/2">
            <label className="block mb-1 text-purple-300">Real Participants</label>
            <select
              name="humanCount"
              value={form.humanCount}
              onChange={handleChange}
              className="w-full p-2 rounded bg-gray-700"
            >
              {[0, 1, 2, 3, 4].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        {success && <p className="text-green-400 text-sm mb-4">{success}</p>}

        <button
          type="submit"
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded font-semibold"
        >
          Create Session
        </button>
      </form>
    </div>
  );
}

export default CreateSession;
