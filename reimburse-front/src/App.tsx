import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { ChatPage } from './pages/ChatPage';
import { KnowledgeDetailPage } from './pages/KnowledgeDetailPage';
import { KnowledgePage } from './pages/KnowledgePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/chat" replace />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="chat/:sessionId" element={<ChatPage />} />
        <Route path="knowledge" element={<KnowledgePage />} />
        <Route path="knowledge/:id" element={<KnowledgeDetailPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
