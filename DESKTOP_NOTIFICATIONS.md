# 🔔 Desktop Notifications Feature

## Overview
ScrumFlow now supports **native Windows desktop notifications** using the Web Notifications API. Users receive real-time notifications about tasks, file uploads, project updates, and more - even when they're not actively looking at the browser tab.

## Features

### ✨ **Automatic Desktop Notifications**
- 🔔 Native Windows notifications appear in the system tray
- 📬 Real-time updates every 15 seconds
- 🎯 Click notification to focus the app
- ⏱️ Auto-dismiss after 5 seconds
- 🔕 Silent mode support

### 📋 **Notification Types**
All existing notification types are supported:
- 📎 **File uploads** - When someone uploads a file to a task/project
- ✅ **Task completed** - When a task is marked as done
- 📝 **Task created** - When a new task is added
- 👤 **Task assigned** - When you're assigned to a task
- 🔄 **Status changed** - When a task moves between columns
- 📊 **Project completed** - When all tasks in a project are done
- 👥 **New member** - When someone joins a project
- 🚪 **Member removed** - When someone leaves a project

### 🎨 **User Experience**
- **Permission Prompt**: Friendly card appears 3 seconds after login
- **One-time Setup**: User grants permission once
- **Persistent**: Permission saved in browser
- **Dismissible**: Users can choose "Not Now"
- **Smart Detection**: Only shows if browser supports notifications

## Technical Implementation

### Files Created

#### 1. **`use-desktop-notifications.ts`** - Custom Hook
```typescript
// Location: client/src/hooks/use-desktop-notifications.ts
// Handles:
// - Permission requests
// - Notification display
// - Duplicate prevention
// - Click handlers
```

#### 2. **`notification-permission-prompt.tsx`** - Permission UI
```typescript
// Location: client/src/components/notifications/notification-permission-prompt.tsx
// Features:
// - Friendly permission request card
// - Auto-appears after 3 seconds
// - Dismissible with localStorage
// - Styled with Tailwind
```

### Integration Points

#### **NotificationBell Component**
```typescript
// Automatically activates desktop notifications
import { useDesktopNotifications } from "@/hooks/use-desktop-notifications";

export default function NotificationBell() {
  useDesktopNotifications(); // ✅ Activates feature
  // ... rest of component
}
```

#### **Dashboard Page**
```typescript
// Shows permission prompt to users
import NotificationPermissionPrompt from "@/components/notifications/notification-permission-prompt";

<NotificationPermissionPrompt /> // ✅ Renders prompt
```

## How It Works

### 1. **Permission Flow**
```
User logs in → Wait 3s → Show permission card → User clicks "Enable"
→ Browser asks for permission → Granted → Desktop notifications active
```

### 2. **Notification Flow**
```
Backend creates notification → Frontend polls every 15s → New notification detected
→ Check if already shown → Create desktop notification → Show for 5s → Auto-dismiss
```

### 3. **Click Behavior**
```
User clicks notification → Window focuses → Navigate to project (if metadata exists)
→ Notification closes
```

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | Recommended |
| Edge | ✅ Full | Windows native |
| Firefox | ✅ Full | Works great |
| Safari | ⚠️ Limited | macOS only |
| Opera | ✅ Full | Chromium-based |

## User Settings

### Enable Notifications
1. Click "Enable Notifications" when prompted
2. Allow in browser permission dialog
3. Done! You'll receive desktop notifications

### Disable Notifications
**Option 1: Browser Settings**
- Chrome: Settings → Privacy → Site Settings → Notifications
- Edge: Settings → Cookies and site permissions → Notifications
- Firefox: Settings → Privacy & Security → Permissions → Notifications

**Option 2: Dismiss Prompt**
- Click "Not Now" on the permission card
- Won't show again (stored in localStorage)

### Re-enable After Dismissing
Clear localStorage:
```javascript
localStorage.removeItem("notification-prompt-dismissed");
```
Then refresh the page.

## API Reference

### `useDesktopNotifications()` Hook

```typescript
const {
  requestPermission,  // () => Promise<boolean>
  hasPermission,      // () => boolean
  isSupported,        // () => boolean
  permission          // "granted" | "denied" | "default"
} = useDesktopNotifications();
```

#### Methods

**`requestPermission()`**
- Requests notification permission from user
- Returns: `Promise<boolean>` - true if granted

**`hasPermission()`**
- Checks if permission is already granted
- Returns: `boolean`

**`isSupported()`**
- Checks if browser supports notifications
- Returns: `boolean`

#### Properties

**`permission`**
- Current permission state
- Values: `"granted"` | `"denied"` | `"default"`

## Notification Object

```typescript
interface DesktopNotification {
  title: string;           // "🖼️ File uploaded in TekproMobile"
  body: string;            // "jensen uploaded 'screenshot.png' to task 'Fix bug'"
  icon: string;            // "/favicon.ico"
  badge: string;           // "/favicon.ico"
  tag: string;             // Unique ID to prevent duplicates
  requireInteraction: boolean; // false (auto-dismiss)
  silent: boolean;         // false (with sound)
}
```

## Security & Privacy

### ✅ **Safe**
- Only shows notifications for authenticated users
- Uses secure session-based API calls
- No sensitive data in notification body
- Respects browser permission model

### 🔒 **Privacy**
- No tracking or analytics
- Notifications stored only in browser memory
- Auto-dismissed after 5 seconds
- User has full control

## Testing

### Manual Testing
1. Login to ScrumFlow
2. Wait for permission prompt (3 seconds)
3. Click "Enable Notifications"
4. Have another user upload a file or create a task
5. Wait up to 15 seconds
6. Desktop notification should appear

### Test Notification Manually
```javascript
// In browser console
new Notification("Test", {
  body: "This is a test notification",
  icon: "/favicon.ico"
});
```

## Troubleshooting

### Notifications Not Appearing

**Check Permission**
```javascript
console.log(Notification.permission); // Should be "granted"
```

**Check Browser Support**
```javascript
console.log("Notification" in window); // Should be true
```

**Check if Blocked**
- Look for 🔔 icon in browser address bar
- Click and set to "Allow"

### Permission Prompt Not Showing

**Check localStorage**
```javascript
localStorage.getItem("notification-prompt-dismissed"); // Should be null
```

**Clear and Retry**
```javascript
localStorage.removeItem("notification-prompt-dismissed");
location.reload();
```

## Future Enhancements

### Planned Features
- [ ] Notification sound customization
- [ ] Notification grouping
- [ ] Do Not Disturb mode
- [ ] Custom notification icons per type
- [ ] Rich notifications with images
- [ ] Action buttons in notifications
- [ ] Notification history
- [ ] Email fallback for denied permissions

### Possible Improvements
- [ ] Service Worker for offline notifications
- [ ] Push notifications (requires backend changes)
- [ ] Notification preferences per type
- [ ] Quiet hours scheduling
- [ ] Desktop notification badge count

## Related Files

```
client/src/
├── hooks/
│   └── use-desktop-notifications.ts          ← Main hook
├── components/
│   └── notifications/
│       ├── notification-bell.tsx              ← Activates feature
│       ├── notification-permission-prompt.tsx ← Permission UI
│       └── notification-list.tsx              ← Existing list
└── pages/
    └── dashboard.tsx                          ← Shows prompt

server/
└── routes/
    ├── notifications.ts                       ← Backend API
    └── attachments.ts                         ← Creates notifications
```

## Credits

Built with:
- **Web Notifications API** - Browser standard
- **React Query** - Data fetching
- **TailwindCSS** - Styling
- **shadcn/ui** - UI components

---

**Note**: Desktop notifications require HTTPS in production. Works on localhost for development.
