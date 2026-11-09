import { lazy, Suspense } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { OverviewPage } from "@/routes/OverviewPage"
import { TripLayout } from "@/routes/TripLayout"

const StagePage = lazy(() =>
  import("@/routes/StagePage").then((m) => ({ default: m.StagePage })),
)

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<TripLayout />}>
          <Route path="/" element={<OverviewPage />} />
          <Route
            path="/etappe/:nr"
            element={
              <Suspense fallback={null}>
                <StagePage />
              </Suspense>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
