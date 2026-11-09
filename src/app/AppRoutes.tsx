import { Route, Routes } from 'react-router'
import { AppShell } from '../components/layout/AppShell'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { VisualFoundationPage } from '../features/dashboard/VisualFoundationPage'
import { NotFoundPage } from './NotFoundPage'

export function AppRoutes() {
  return <Routes><Route element={<AppShell />}><Route index element={<DashboardPage />} /><Route path="base-visual" element={<VisualFoundationPage />} /><Route path="*" element={<NotFoundPage />} /></Route></Routes>
}
