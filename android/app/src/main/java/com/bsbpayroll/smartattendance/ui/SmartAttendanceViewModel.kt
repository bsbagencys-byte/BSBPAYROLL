package com.bsbpayroll.smartattendance.ui

import com.bsbpayroll.smartattendance.data.GeofenceRequest
import com.bsbpayroll.smartattendance.data.LoginRequest
import com.bsbpayroll.smartattendance.data.QrScanRequest
import com.bsbpayroll.smartattendance.data.SmartAttendanceApi
import com.bsbpayroll.smartattendance.geofence.GeofenceController
import com.bsbpayroll.smartattendance.geofence.LocationSample
import com.bsbpayroll.smartattendance.security.DeviceSigner
import java.time.Instant
import java.util.UUID

data class UiState(
    val token: String? = null,
    val message: String = "Location is collected only for attendance evidence. The app does not decide validity.",
    val continuousTracking: Boolean = false
)

class SmartAttendanceViewModel(
    private val api: SmartAttendanceApi,
    private val publicKey: String,
    private val deviceId: String,
    private val geofence: GeofenceController = GeofenceController()
) {
    var state = UiState()
        private set

    suspend fun login(username: String, password: String) {
        val result = api.login(LoginRequest(username, password))
        state = state.copy(token = result.token, message = result.message ?: "Signed in.")
    }

    suspend fun refreshPolicy() {
        val token = state.token ?: return
        val policy = api.me(token)
        state = state.copy(
            continuousTracking = policy.continuous,
            message = policy.purpose
        )
    }

    suspend fun submitEnter(workplaceId: String, lat: Double, lon: Double, accuracy: Double, mock: Boolean) {
        submitGeofence("ENTER", workplaceId, lat, lon, accuracy, mock, true)
    }

    suspend fun submitExit(workplaceId: String, lat: Double, lon: Double, accuracy: Double, mock: Boolean) {
        submitGeofence("EXIT", workplaceId, lat, lon, accuracy, mock, true)
    }

    suspend fun flushQueued(online: Boolean) {
        if (!online) return
        val token = state.token ?: return
        for (item in geofence.drainQueue()) {
            val key = UUID.randomUUID().toString()
            api.submitGeofence(
                token,
                GeofenceRequest(
                    deviceId = deviceId,
                    workplaceId = item.workplaceId,
                    kind = item.kind,
                    latitude = item.sample.latitude,
                    longitude = item.sample.longitude,
                    accuracyMeters = item.sample.accuracyMeters,
                    occurredAt = item.sample.occurredAt,
                    permissionStatus = "GRANTED",
                    mockLocation = item.sample.mockLocation,
                    integrityResult = "UNAVAILABLE",
                    idempotencyKey = key,
                    signature = DeviceSigner.hmac(publicKey, key)
                )
            )
        }
        state = state.copy(message = "Queued candidates flushed with original occurred_at. Server decides.")
    }

    private suspend fun submitGeofence(
        kind: String,
        workplaceId: String,
        lat: Double,
        lon: Double,
        accuracy: Double,
        mock: Boolean,
        online: Boolean
    ) {
        val token = state.token ?: return
        val sample = LocationSample(lat, lon, accuracy, mock, Instant.now().toString())
        if (geofence.queueIfOffline(workplaceId, kind, sample, online)) {
            state = state.copy(message = "Queued $kind with original timestamp. Delivery is delayed; server will not invent a new time.")
            return
        }
        val key = UUID.randomUUID().toString()
        val result = api.submitGeofence(
            token,
            GeofenceRequest(
                deviceId = deviceId,
                workplaceId = workplaceId,
                kind = kind,
                latitude = lat,
                longitude = lon,
                accuracyMeters = accuracy,
                occurredAt = sample.occurredAt,
                permissionStatus = "GRANTED",
                mockLocation = mock,
                integrityResult = "UNAVAILABLE",
                idempotencyKey = key,
                signature = DeviceSigner.hmac(publicKey, key)
            )
        )
        state = state.copy(message = result.message ?: "Submitted. Server decides.")
    }

    suspend fun scan(tokenValue: String, pin: String?, lat: Double, lon: Double, accuracy: Double) {
        val token = state.token ?: return
        val key = UUID.randomUUID().toString()
        val result = api.scanQr(
            token,
            QrScanRequest(
                token = tokenValue,
                pin = pin,
                deviceId = deviceId,
                latitude = lat,
                longitude = lon,
                accuracyMeters = accuracy,
                occurredAt = Instant.now().toString(),
                mockLocation = false,
                integrityResult = "UNAVAILABLE",
                idempotencyKey = key,
                signature = DeviceSigner.hmac(publicKey, key)
            )
        )
        state = state.copy(message = result.message ?: "QR submitted.")
    }
}
