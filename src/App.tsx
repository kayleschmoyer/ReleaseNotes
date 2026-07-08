import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { DataProvider } from './api/DataProvider'
import { AppShell } from './pages/AppShell'
import { Compare } from './pages/Compare'
import { Home } from './pages/Home'
import { Release } from './pages/Release'
import { SignIn } from './pages/SignIn'

export default function App() {
  return (
    <DataProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/signin" element={<SignIn />} />
          <Route element={<AppShell />}>
            <Route index element={<Home />} />
            <Route path="/release/:version" element={<Release />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="*" element={<Home />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DataProvider>
  )
}
