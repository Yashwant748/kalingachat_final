import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Tailwind CSS
import "./index.css";

// Initialize dark mode by default
const savedTheme = localStorage.getItem("theme");
if (!savedTheme) {
  document.documentElement.classList.add("dark");
  localStorage.setItem("theme", "dark");
} else if (savedTheme === "dark") {
  document.documentElement.classList.add("dark");
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);