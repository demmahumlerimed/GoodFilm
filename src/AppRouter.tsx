import { Routes, Route } from "react-router-dom";
import App from "./App";
import MediaDetail from "./pages/MediaDetail";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/media/movie/:id" element={<MediaDetail mediaType="movie" />} />
      <Route path="/media/tv/:id"    element={<MediaDetail mediaType="tv" />} />
      <Route path="*"                element={<App />} />
    </Routes>
  );
}
