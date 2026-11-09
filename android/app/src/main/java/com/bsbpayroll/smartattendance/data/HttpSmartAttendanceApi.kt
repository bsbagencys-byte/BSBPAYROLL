package com.bsbpayroll.smartattendance.data

import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class HttpSmartAttendanceApi(private val baseUrl: String) : SmartAttendanceApi {
    override suspend fun login(request: LoginRequest): LoginResponse {
        val body = jsonObject(
            "username" to request.username,
            "password" to request.password
        )
        val raw = request("POST", "$baseUrl/api/mobile/auth/login", body, null)
        return LoginResponse(
            ok = raw.contains("\"ok\":true") || raw.contains("\"ok\": true"),
            token = stringField(raw, "token"),
            message = stringField(raw, "message")
        )
    }

    override suspend fun me(token: String): TrackingPolicy {
        val raw = request("GET", "$baseUrl/api/mobile/me", null, token)
        val continuous = raw.contains("\"continuous\":true") || raw.contains("\"continuous\": true")
        return TrackingPolicy(
            continuous = continuous,
            purpose = stringField(raw, "purpose")
                ?: "Attendance evidence only. Location is collected for geofence or QR events, not throughout the day.",
            backgroundLocation = raw.contains("\"backgroundLocation\":true"),
            preciseLocation = !raw.contains("\"preciseLocation\":false")
        )
    }

    override suspend fun registerDevice(
        token: String,
        publicKey: String,
        model: String,
        os: String,
        app: String
    ): ApiResult {
        val body = jsonObject(
            "publicKey" to publicKey,
            "deviceModel" to model,
            "osVersion" to os,
            "appVersion" to app,
            "attestationKind" to "PLAY_INTEGRITY",
            "attestationResult" to "UNAVAILABLE"
        )
        return parseResult(request("POST", "$baseUrl/api/mobile/devices/register", body, token))
    }

    override suspend fun submitGeofence(token: String, request: GeofenceRequest): ApiResult {
        val body = jsonObject(
            "deviceId" to request.deviceId,
            "workplaceId" to request.workplaceId,
            "kind" to request.kind,
            "latitude" to request.latitude,
            "longitude" to request.longitude,
            "accuracyMeters" to request.accuracyMeters,
            "occurredAt" to request.occurredAt,
            "permissionStatus" to request.permissionStatus,
            "mockLocation" to request.mockLocation,
            "integrityResult" to request.integrityResult,
            "idempotencyKey" to request.idempotencyKey,
            "signature" to request.signature
        )
        return parseResult(this.request("POST", "$baseUrl/api/mobile/events/geofence", body, token))
    }

    override suspend fun scanQr(token: String, request: QrScanRequest): ApiResult {
        val body = jsonObject(
            "token" to request.token,
            "pin" to request.pin,
            "deviceId" to request.deviceId,
            "latitude" to request.latitude,
            "longitude" to request.longitude,
            "accuracyMeters" to request.accuracyMeters,
            "occurredAt" to request.occurredAt,
            "mockLocation" to request.mockLocation,
            "integrityResult" to request.integrityResult,
            "idempotencyKey" to request.idempotencyKey,
            "signature" to request.signature
        )
        return parseResult(this.request("POST", "$baseUrl/api/mobile/qr/scan", body, token))
    }

    private fun parseResult(raw: String): ApiResult {
        return ApiResult(
            ok = raw.contains("\"ok\":true") || raw.contains("\"ok\": true"),
            accepted = raw.contains("\"accepted\":true") || raw.contains("\"ACCEPTED\""),
            message = stringField(raw, "message")
        )
    }

    private fun jsonObject(vararg pairs: Pair<String, Any?>): String {
        return pairs.joinToString(prefix = "{", postfix = "}") { (key, value) ->
            val encoded = when (value) {
                null -> "null"
                is Number, is Boolean -> value.toString()
                else -> "\"${value.toString().replace("\\", "\\\\").replace("\"", "\\\"")}\""
            }
            "\"$key\":$encoded"
        }
    }

    private fun stringField(raw: String, key: String): String? {
        val match = Regex("\"$key\"\\s*:\\s*\"([^\"]*)\"").find(raw)
        return match?.groupValues?.getOrNull(1)
    }

    private fun request(method: String, url: String, body: String?, token: String?): String {
        val connection = URL(url).openConnection() as HttpURLConnection
        try {
            connection.requestMethod = method
            connection.connectTimeout = 15_000
            connection.readTimeout = 15_000
            connection.setRequestProperty("Accept", "application/json")
            connection.setRequestProperty("Content-Type", "application/json")
            if (token != null) connection.setRequestProperty("Authorization", "Bearer $token")
            if (body != null) {
                connection.doOutput = true
                OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { it.write(body) }
            }
            val stream = if (connection.responseCode in 200..299) connection.inputStream else connection.errorStream
            return BufferedReader(InputStreamReader(stream, Charsets.UTF_8)).use { it.readText() }
        } finally {
            connection.disconnect()
        }
    }
}
