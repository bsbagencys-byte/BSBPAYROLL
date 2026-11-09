package com.bsbpayroll.smartattendance.geofence

import com.bsbpayroll.smartattendance.data.Workplace

data class LocationSample(
    val latitude: Double,
    val longitude: Double,
    val accuracyMeters: Double,
    val mockLocation: Boolean,
    val occurredAt: String
)

data class QueuedCandidate(
    val workplaceId: String,
    val kind: String,
    val sample: LocationSample
)

class GeofenceController {
    private val pending = mutableListOf<QueuedCandidate>()

    fun inside(workplace: Workplace, sample: LocationSample): Boolean {
        val earth = 6_371_000.0
        val dLat = Math.toRadians(sample.latitude - workplace.latitude)
        val dLon = Math.toRadians(sample.longitude - workplace.longitude)
        val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(Math.toRadians(workplace.latitude)) *
            Math.cos(Math.toRadians(sample.latitude)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
        val distance = 2 * earth * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return distance <= workplace.radiusMeters
    }

    fun queueIfOffline(workplaceId: String, kind: String, sample: LocationSample, online: Boolean): Boolean {
        if (online) return false
        pending.add(QueuedCandidate(workplaceId, kind, sample))
        return true
    }

    fun drainQueue(): List<QueuedCandidate> {
        val copy = pending.toList()
        pending.clear()
        return copy
    }
}
