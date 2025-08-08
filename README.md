# MERT & MEMNUNE – 27.09.2025 Anılar Bulutta

Ziyaretçiler sadece dosya yükleyebilir. İçerikleri sadece admin görebilir.

## Firestore Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /media/{docId} {
      allow read: if request.auth != null && request.auth.token.email == "merttrem174@gmail.com";
      allow create: if request.auth != null
        && request.resource.data.eventCode is string
        && request.resource.data.type in ['image','video']
        && request.resource.data.path is string
        && request.resource.data.createdAt != null;
    }
  }
}
```

## Storage Rules
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /events/{eventCode}/{fileId} {
      allow read: if request.auth != null && request.auth.token.email == "merttrem174@gmail.com";
      allow write: if request.auth != null
        && (request.resource.contentType.matches('image/.*')
            || request.resource.contentType.matches('video/.*'));
    }
  }
}
```

## Kullanım
- Sabit kod: MERT-MEMNUNE-2025
