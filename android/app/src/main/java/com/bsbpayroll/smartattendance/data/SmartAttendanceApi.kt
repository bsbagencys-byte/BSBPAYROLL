package com.bsbpayroll.smartattendance.data

interface SmartAttendanceApi {
    suspend fun login(request: LoginRequest): LoginResponse
    suspend fun me(token: String): TrackingPolicy
    suspend fun registerDevice(token: String, publicKey: String, model: String, os: String, app: String): ApiResult
    suspend fun submitGeofence(token: String, request: GeofenceRequest): ApiResult
    suspend fun scanQr(token: String, request: QrScanRequest): ApiResult
}
