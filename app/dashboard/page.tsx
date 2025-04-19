"use client"
export const dynamicSetting = "force-dynamic"

import React, { Suspense } from "react"
import DashboardMainContent from "./DashboardMainContent"

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading dashboard...</div>}>
      <DashboardMainContent />
    </Suspense>
  )
}
