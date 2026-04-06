import { Routes, Route } from "react-router-dom";
import App from "./App";
import MediaDetail from "./pages/MediaDetail";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/movie/:id" element={<MediaDetail mediaType="movie" />} />
      <Route path="/tv/:id" element={<MediaDetail mediaType="tv" />} />
      {/* Fallback → home */}
      <Route path="*" element={<App />} />
    </Routes>
  );
}
