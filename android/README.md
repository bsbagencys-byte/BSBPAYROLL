# BSB Smart Attendance (Android)

Kotlin + Jetpack Compose MVVM client for Phase 21. It talks to the existing BSB Payroll backend. There is no separate attendance database.

## Contract

- Login: `POST /api/mobile/auth/login`
- Profile, workplaces, devices: `GET /api/mobile/me`
- Register device: `POST /api/mobile/devices/register`
- Geofence candidate: `POST /api/mobile/events/geofence`
- Dynamic QR: `POST /api/mobile/qr/scan`

The app never decides validity. The server evaluates geofence, trusted device, freshness, accuracy, mock-location and integrity signals.

## Privacy

Location is collected only as attendance evidence for ENTER/EXIT/QR. Continuous tracking is off unless the organization enables background location. Show a purpose string before requesting precise location.

## Build notes

This folder is a source overlay, not a prebuilt APK. Point `BASE_URL` at the same host as the web app. HMAC device signatures use the registered public key over the idempotency key. Android Keystore-backed keys are not wired; HMAC-SHA256 is the current contract.

Offline ENTER/EXIT candidates keep the original `occurredAt`. The server never invents a later timestamp. Duplicate same-direction events inside the organization interval are not a second punch.

Permanent static QR codes are not accepted. Only short-lived signed tokens from `/attendance/smart` work.
