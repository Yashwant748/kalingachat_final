import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ThemeToggle() {
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setIsDarkMode(savedTheme === "dark");
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    
    const root = document.documentElement;
    if (newMode) {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", newMode ? "dark" : "light");
  };

  return (
    <Button
      onClick={toggleTheme}
      variant="ghost"
      size="sm"
      className="w-12 h-6 rounded-full bg-cyber-gray border border-cyber-blue/30 relative transition-all duration-300 hover:shadow-lg hover:shadow-cyber-blue/30 p-0"
    >
      <div 
        className={`w-5 h-5 rounded-full absolute top-0.5 transition-transform duration-300 shadow-lg ${
          isDarkMode 
            ? 'left-0.5 gradient-neon' 
            : 'left-6 gradient-hot'
        }`}
      />
    </Button>
  );
}
