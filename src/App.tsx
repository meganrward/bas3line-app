import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<div className="p-8 text-center text-gray-500">Login — coming in Phase 2</div>} />
        <Route path="/sponsor/*" element={<div className="p-8 text-center text-gray-500">Sponsor dashboard — coming in Phase 4</div>} />
        <Route path="/athlete/*" element={<div className="p-8 text-center text-gray-500">Athlete dashboard — coming in Phase 3</div>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
