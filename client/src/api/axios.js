// src/api/axios.js
import axios from "axios";

const instance = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL + "/api",
  withCredentials: false,
});

export default instance;
