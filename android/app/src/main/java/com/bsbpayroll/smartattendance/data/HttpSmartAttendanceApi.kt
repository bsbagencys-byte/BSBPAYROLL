package com.bsbpayroll.smartattendance.data

class HttpSmartAttendanceApi(private val baseUrl: String) : SmartAttendanceApi {
    override suspend fun login(request: LoginRequest): LoginResponse {
        return postJson("$baseUrl/api/mobile/auth/login", request, null, LoginResponse::class)
    }

    override suspend fun me(token: String): TrackingPolicy {
        return getJson("$baseUrl/api/mobile/me", token)
    }

    override suspend fun registerDevice(
        token: String,
        publicKey: String,
        model: String,
        os: String,
        app: String
    ): ApiResult {
        return postJson(
            "$baseUrl/api/mobile/devices/register",
            mapOf(
                "publicKey" to publicKey,
                "deviceModel" to model,
                "osVersion" to os,
                "appVersion" to app,
                "attestationKind" to "PLAY_INTEGRITY",
                "attestationResult" to "UNAVAILABLE"
            ),
            token,
            ApiResult::class
        )
    }

    override suspend fun submitGeofence(token: String, request: GeofenceRequest): ApiResult {
        return postJson("$baseUrl/api/mobile/events/geofence", request, token, ApiResult::class)
    }

    override suspend fun scanQr(token: String, request: QrScanRequest): ApiResult {
        return postJson("$baseUrl/api/mobile/qr/scan", request, token, ApiResult::class)
    }

    private fun <T> postJson(url: String, body: Any, token: String?, type: Any): T {
        throw UnsupportedOperationException("Wire OkHttp/Retrofit in the Android Studio project. Endpoint: $url")
    }

    private fun <T> getJson(url: String, token: String): T {
        throw UnsupportedOperationException("Wire OkHttp/Retrofit in the Android Studio project. Endpoint: $url")
    }
}
