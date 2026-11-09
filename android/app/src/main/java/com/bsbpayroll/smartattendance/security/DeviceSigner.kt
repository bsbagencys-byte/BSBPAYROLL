package com.bsbpayroll.smartattendance.security

import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

object DeviceSigner {
    fun hmac(publicKey: String, payload: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(publicKey.toByteArray(), "HmacSHA256"))
        return mac.doFinal(payload.toByteArray()).joinToString("") { byte -> "%02x".format(byte) }
    }

    fun keystoreNote(): String {
        return "Device HMAC-SHA256 signs the idempotency key with the registered public key. Android Keystore-backed keys are not wired in this overlay; HMAC is the current contract, not hardware attestation."
    }
}
