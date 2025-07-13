import axios from "axios";

const instance = axios.create({
  baseURL: "http://localhost:5000/api", // change to live URL after deployment
  withCredentials: false, // we will use token in headers manually
});

export default instance;
