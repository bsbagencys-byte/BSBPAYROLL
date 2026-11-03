package com.bsbpayroll.smartattendance.ui

class Screens {
    fun loginCopy() = "Sign in with your BSB Payroll username. The phone does not store punches locally as source of truth."

    fun permissionCopy() =
        "BSB Payroll uses precise location only to confirm workplace entry or exit for attendance. Tracking is not continuous."

    fun fallbackCopy() = "If GPS is weak, scan a short-lived workplace QR. Permanent static QR codes are rejected."
}
