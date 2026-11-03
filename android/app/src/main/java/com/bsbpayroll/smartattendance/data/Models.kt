package com.bsbpayroll.smartattendance.data

data class LoginRequest(val username: String, val password: String)

data class LoginResponse(
    val ok: Boolean,
    val token: String? = null,
    val message: String? = null
)

data class Workplace(
    val id: String,
    val name: String,
    val latitude: Double,
    val longitude: Double,
    val radiusMeters: Int
)

data class TrackingPolicy(
    val continuous: Boolean,
    val purpose: String,
    val backgroundLocation: Boolean,
    val preciseLocation: Boolean
)

data class GeofenceRequest(
    val deviceId: String,
    val workplaceId: String,
    val kind: String,
    val latitude: Double,
    val longitude: Double,
    val accuracyMeters: Double,
    val occurredAt: String,
    val permissionStatus: String,
    val mockLocation: Boolean,
    val integrityResult: String?,
    val idempotencyKey: String,
    val signature: String
)

data class QrScanRequest(
    val token: String,
    val pin: String?,
    val deviceId: String,
    val latitude: Double,
    val longitude: Double,
    val accuracyMeters: Double,
    val occurredAt: String,
    val mockLocation: Boolean,
    val integrityResult: String?,
    val idempotencyKey: String,
    val signature: String
)

data class ApiResult(
    val ok: Boolean,
    val accepted: Boolean? = null,
    val message: String? = null
)
