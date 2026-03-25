# DataLabel Mobile App
## Team8-WDP — React Native (Expo)

A professional data labeling mobile platform for managing annotation projects.

---

## 🚀 Quick Setup

### 1. Prerequisites
```bash
node >= 18
npm >= 9
expo-cli (install globally): npm install -g expo-cli
```

### 2. Install Dependencies
```bash
cd DataLabelingApp
npm install
```

### 3. Configure Backend URL
Open `src/services/api.js` and update:
```js
export const BASE_URL = 'http://YOUR_BACKEND_IP:5000';
```
> ⚠️ Use your machine's local IP (e.g. `192.168.1.x`), NOT `localhost` — the mobile device needs to reach the backend over the network.

### 4. Start the App
```bash
npx expo start
```
Then scan the QR code with **Expo Go** (iOS/Android) or press `a` for Android emulator / `i` for iOS simulator.

---

## 👥 User Roles & Features

### 🔴 Admin
- Dashboard with user statistics
- **CRUD Users**: create/edit/delete/activate/deactivate
- **Activity Logs**: filterable real-time audit trail
- **System Settings**: storage, task, review, notification config

### 🟡 Manager
- Dashboard with project overview & quick actions
- **Projects**: create with label sets, guidelines, review policy
- **Datasets**: upload images or ZIP files per project
- **Assign Tasks**: select dataset + annotators + reviewers
- **Approved Datasets**: view majority-approved results
- **Export**: JSON / CSV / COCO format

### 🔵 Annotator
- **My Tasks**: filtered by status (assigned/in_progress/submitted/approved/rejected)
- **Task Detail**: view image, labels, reviewer feedback
- **Labeling Canvas**: draw bounding boxes, select labels, revise rejected work
- **Submit**: send completed annotations for review

### 🟢 Reviewer
- **Review Queue**: pending submissions to review
- **Review Interface**: view image with annotations, add feedback notes by tapping
- **Approve / Reject**: with error category and comments (required for rejection)
- **History**: all previously reviewed tasks with filter

---

## 🏗️ Project Structure

```
DataLabelingApp/
├── App.js                          # Entry point
├── app.json                        # Expo config
├── src/
│   ├── context/
│   │   └── AuthContext.js          # Global auth state
│   ├── services/
│   │   └── api.js                  # All API calls (axios)
│   ├── theme/
│   │   └── index.js                # Design system tokens
│   ├── components/
│   │   └── UI.js                   # Shared components
│   ├── navigation/
│   │   ├── RootNavigator.js        # Role-based routing
│   │   ├── AdminNavigator.js       # Admin tabs
│   │   ├── ManagerNavigator.js     # Manager tabs
│   │   ├── AnnotatorNavigator.js   # Annotator tabs
│   │   └── ReviewerNavigator.js    # Reviewer tabs
│   └── screens/
│       ├── auth/
│       │   └── LoginScreen.js
│       ├── admin/
│       │   ├── AdminDashboardScreen.js
│       │   ├── AdminUsersScreen.js
│       │   ├── AdminCreateUserScreen.js
│       │   ├── AdminEditUserScreen.js
│       │   ├── AdminActivityLogsScreen.js
│       │   └── AdminSettingsScreen.js
│       ├── manager/
│       │   ├── ManagerDashboardScreen.js
│       │   ├── ManagerProjectsScreen.js
│       │   ├── ManagerCreateProjectScreen.js
│       │   ├── ManagerProjectDetailScreen.js
│       │   ├── ManagerDatasetsScreen.js
│       │   ├── ManagerDatasetDetailScreen.js
│       │   ├── ManagerUploadDatasetScreen.js
│       │   ├── ManagerAssignTaskScreen.js
│       │   ├── ManagerApprovedDatasetScreen.js
│       │   └── ManagerProfileScreen.js
│       ├── annotator/
│       │   ├── AnnotatorTasksScreen.js
│       │   ├── AnnotatorTaskDetailScreen.js
│       │   ├── AnnotatorLabelingScreen.js
│       │   └── AnnotatorProfileScreen.js
│       └── reviewer/
│           ├── ReviewerQueueScreen.js
│           ├── ReviewerTaskScreen.js
│           ├── ReviewerHistoryScreen.js
│           └── ReviewerProfileScreen.js
```

---

## 🎨 Design System

**Theme**: Industrial dark — electric blue + neon green accents on deep charcoal.

| Color | Usage |
|-------|-------|
| `#0A0C10` | Background |
| `#12151C` | Card surface |
| `#4F8EF7` | Primary (blue) |
| `#00E5A0` | Accent (green) |
| `#FF4757` | Danger |
| `#F7B731` | Warning |

---

## 🔑 Default Credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | admin123 |
| Manager | manager@example.com | manager123 |
| Annotator | annotator1@example.com | annotator123 |
| Reviewer | reviewer1@example.com | reviewer123 |

---

## 🧠 AI-Assisted Labeling (Optional)

The labeling screen is ready for AI label suggestions. To enable:
1. Add an AI inference endpoint to your backend
2. Call it from `AnnotatorLabelingScreen.js` when an image loads
3. Pre-populate `annotations` state with AI-suggested bounding boxes
4. Annotators can accept, adjust, or reject suggestions

---

## 📦 Key Dependencies

| Package | Purpose |
|---------|---------|
| `expo` | App framework |
| `@react-navigation/*` | Navigation |
| `axios` | API calls |
| `@react-native-async-storage` | Token persistence |
| `expo-image-picker` | Photo selection |
| `expo-document-picker` | File upload |
| `react-native-svg` | Bounding box canvas |
| `expo-linear-gradient` | UI gradients |

---

## ⚠️ Notes

- The app uses **Expo Go** for development. For production, build with `eas build`.
- Image uploads require the backend to be accessible on the same network as the device.
- The majority-approval logic: if ≥ 50% of assigned reviewers approve, the dataset counts as approved.
- All bounding boxes are stored as `[x, y, width, height]` in pixels relative to the displayed image size.
