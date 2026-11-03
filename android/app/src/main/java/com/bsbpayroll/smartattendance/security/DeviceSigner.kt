package com.bsbpayroll.smartattendance.security

import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

object DeviceSigner {
    fun hmac(publicKey: String, payload: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(publicKey.toByteArray(), "HmacSHA256"))
        return mac.doFinal(payload.toByteArray()).joinToString("") { byte -> "%02x".format(byte) }
    }
}
