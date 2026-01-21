import axios from "axios";

const apiClient = axios.create({
  baseURL: "http://192.168.1.6:3000/api",
  timeout: 5000,
  headers: { "Content-Type": "application/json" },
});

export default apiClient;
