import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Portal } from './pages/Portal';
import { Studio } from './pages/Studio';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect root to portal */}
        <Route path="/" element={<Navigate to="/portal" replace />} />
        
        {/* Portal landing page */}
        <Route path="/portal" element={<Portal />} />
        
        {/* Studio task planning interface */}
        <Route path="/studio" element={<Studio />} />
        
        {/* Catch-all redirect to portal */}
        <Route path="*" element={<Navigate to="/portal" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
