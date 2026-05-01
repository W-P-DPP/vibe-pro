import { Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { TodoPage } from './pages/TodoPage'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<TodoPage />} />
      </Route>
    </Routes>
  )
}

export default App
