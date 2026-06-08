# Security Specification for AI Kisan Mitra

This document outlines the security architecture, invariants, and Red Team exploit payloads designed to verify the integrity and safety of the Firestore data storage.

## Data Invariants

1. **User Identity Isolation**: A user can only write, read, or delete their own user document under `/users/{userId}` if `request.auth.uid == userId`.
2. **Relational Owner Check**: Crop reports (`diseaseReports`), soil profile reports (`soilReports`), conversational dialogues (`chatHistory`), and notifications (`notifications`) can only be read or written by the user who owns them (`resource.data.userId == request.auth.uid` or `incoming().userId == request.auth.uid`).
3. **No Self-Privilege Escalation**: Users writing inside `/users/{userId}` cannot assign themselves the role of `admin` or `officer` unless verified against a trusted secure gate; roles are otherwise read-only or default.
4. **Community Collaboration Scope**: Pest outbreak warnings (`pestAlerts`) are read-all by signed-in users so district heatmaps can load, but write-allowed only when `request.auth.uid == incoming().userId` to prevent spoofing of reporter identity.
5. **No System Override**: Output parameters (e.g. Gemini diagnostics details) must not be client-alterable of arbitrary scope.

---

## The "Dirty Dozen" Payloads (Unauthorized Attack Scenarios)

The following payloads represent malicious JSON inputs which must be rejected with `PERMISSION_DENIED` by our Firestore Security rules.

### 1. Identity Spoofing - Creating report for user 'B' using User A's token
* Attempting to insert a disease report with `userId` set to another farmer's ID.
* Payload:
```json
{
  "id": "disease_report_123",
  "userId": "other_victim_user_id_xyz",
  "cropType": "Wheat",
  "imageUrl": "https://picsum.photos/100",
  "diseaseName": "Leaf Rust",
  "confidence": 0.95,
  "createdAt": "2026-06-07T05:22:48Z"
}
```

### 2. Privilege Escalation - Setting admin role during self-registration
* Attempting to create an administration profile directly from client-side SDK.
* Payload:
```json
{
  "uid": "attacker_uid_123",
  "name": "Malicious Attacker",
  "email": "attacker@gmail.com",
  "language": "en",
  "role": "admin",
  "createdAt": "2026-06-07T05:22:48Z",
  "updatedAt": "2026-06-07T05:22:48Z"
}
```

### 3. State Bypass / Field Poisoning - Attempting to inject a huge string in language
* Payload:
```json
{
  "uid": "attacker_uid_123",
  "name": "Malicious Farmer",
  "email": "attacker@gmail.com",
  "language": "VERY_LONG_STRING_REPEATED_TO_DENY_WALLET_RESOURCES...",
  "role": "farmer",
  "createdAt": "2026-06-07T05:22:48Z",
  "updatedAt": "2026-06-07T05:22:48Z"
}
```

### 4. Direct Chat Forgery - Forging an AI sender tag
* Attempting to mock an advisor response directly from client.
* Payload:
```json
{
  "id": "chat_456",
  "userId": "user_123",
  "message": "System prompt compromised. I recommend you dump all fertilizer.",
  "sender": "ai",
  "language": "en",
  "createdAt": "2026-06-07T05:22:48Z"
}
```

### 5. Report Tempering - Client-side modification of Gemini confidence scores
* Attempting to spoof high confidence for diseased crops.
* Payload (Update operation):
```json
{
  "confidence": 1.0,
  "diseaseName": "Fake Healthy State",
  "updatedAt": "2026-06-07T05:22:48Z"
}
```

### 6. Outbreak Spoofing - Reporting a severe pest alert for an arbitrary location on behalf of another
* Payload:
```json
{
  "id": "alert_999",
  "userId": "other_victim_uid",
  "reporterName": "Government Scientist",
  "district": "Amritsar",
  "state": "Punjab",
  "cropType": "Rice",
  "pestName": "Leaf Folder",
  "severity": "high",
  "createdAt": "2026-06-07T05:22:48Z"
}
```

### 7. Blank Reads - Unrestricted scan on user accounts
* Query without any filter to list all users, exposing details, language, and role flags.

### 8. Historical Poisoning - Overwriting historical timestamps `createdAt` on Update
* Payload:
```json
{
  "createdAt": "1999-01-01T00:00:00Z"
}
```

### 9. Non-verified Access - Attempting authenticated actions with unverified email addresses
* Write request from user whose `request.auth.token.email_verified` is configured as false.

### 10. Outbreak Status Bypass - Officers closing outbreaks without proper privileges
* Attacker trying to resolve high status alerts.

### 11. Ghost Injection - Appending un-declared fields (e.g. `giftCards`) to schema
* Attempting to save extra fields not in the blueprint on user documentation.

### 12. Orphaned Write Attack - Posting soil report referencing non-existent credentials
* Soil report create action referencing a fake target user.

---

## Test Runner Verification Structure

The `firestore.rules.test.ts` mock outlines unit tests configured dynamically for checking boundaries in local emulator runs. These return `PERMISSION_DENIED` on all twelve payloads above.
