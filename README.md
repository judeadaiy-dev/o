SeaChat/
├── App.tsx                          // Navigation + AuthProvider
├── package.json                     // RN 0.85.0, React 19.1.0
├── babel.config.js                  // ES2024 support
├── metro.config.js
├── tsconfig.json                    // strict mode
├── src/
│   ├── screens/
│   │   ├── AuthScreen.tsx           // دمج Login + SignUp كامل
│   │   ├── RoomsScreen.tsx          // + البحث + عدد المتصلين
│   │   ├── ChatRoomScreen.tsx       // + صور + تعديل + حذف + طرد
│   │   ├── DirectChatScreen.tsx     // + تشفير E2E + حظر + تبليغ
│   │   ├── CreateRoomScreen.tsx     // كامل مع رفع صورة
│   │   ├── ProfileScreen.tsx        // + تعديل avatar + احصائيات
│   │   ├── SettingsScreen.tsx       // + الإشعارات + الحظر
│   │   ├── AdminPanelScreen.tsx     // كامل مع actions
│   │   ├── BlockedUsersScreen.tsx   // جديد: قائمة المحظورين
│   │   └── ReportsScreen.tsx        // جديد: إدارة البلاغات
│   ├── components/
│   │   ├── NotificationBanner.tsx   // In-app notification
│   │   ├── ReportModal.tsx          // مودال التبليغ
│   │   └── BlockButton.tsx          // زر حظر موحد
│   ├── services/
│   │   ├── supabase.ts              // client + types
│   │   ├── notifications.ts         // Push + Realtime
│   │   ├── encryption.ts            // CryptoJS wrapper
│   │   └── moderation.ts            // حظر + تبليغ logic
│   ├── hooks/
│   │   ├── useAuth.ts               // Session + Profile
│   │   └── useNotifications.ts      // جديد
│   └── types/
│       └── database.types.ts        // Supabase generated types
└── supabase/
    └── migrations/
        ├── 001_initial.sql          // profiles, rooms, messages
        ├── 002_direct_chat.sql      // conversations, direct_messages
        ├── 003_moderation.sql       // blocks, reports, room_bans
        └── 004_notifications.sql    // notifications table
