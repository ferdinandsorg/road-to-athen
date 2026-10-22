import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { OverviewPage } from "@/routes/OverviewPage"
import { StagePage } from "@/routes/StagePage"
import { TripLayout } from "@/routes/TripLayout"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<TripLayout />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/etappe/:nr" element={<StagePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
