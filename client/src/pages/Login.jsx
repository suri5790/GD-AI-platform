import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";

// ✅ Use environment variable
const BASE_URL = import.meta.env.VITE_SERVER_URL;

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");

  useEffect(() => {
    if (location.state?.message) {
      setFlash(location.state.message);
      setTimeout(() => setFlash(""), 3000);
    }
  }, [location]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.post(`${BASE_URL}/api/auth/login`, form);
      localStorage.setItem("token", res.data.token);

      const redirectTo = location.state?.redirectTo || "/dashboard";
      navigate(redirectTo);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
      <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded-xl shadow-md w-full max-w-md">
        <h2 className="text-3xl font-bold mb-6 text-center">Login</h2>

        {flash && (
          <div className="mb-4 px-4 py-2 rounded bg-green-500 text-white text-center">
            ✅ {flash}
          </div>
        )}

        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
          className="w-full mb-4 p-3 rounded bg-gray-700 text-white outline-none focus:ring-2 focus:ring-purple-500"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
          className="w-full mb-4 p-3 rounded bg-gray-700 text-white outline-none focus:ring-2 focus:ring-purple-500"
        />

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <button
          type="submit"
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded font-semibold"
        >
          Login
        </button>

        <p className="mt-4 text-sm text-center">
          Don’t have an account?{" "}
          <a href="/register" className="text-purple-400 hover:underline">
            Register
          </a>
        </p>
      </form>
    </div>
  );
}

export default Login;
