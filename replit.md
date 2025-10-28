# HARU Hotel Management System

## Overview

HARU is a Progressive Web Application (PWA) for hotel management, focusing on linen inventory, maintenance tracking, lost & found management, and staff operations. The system is built with vanilla JavaScript and Firebase, designed for both field staff (mobile) and office administrators (desktop).

**Core Purpose**: Streamline hotel operations by providing real-time inventory tracking, maintenance logging, communication tools, and administrative oversight in a mobile-first, installable web application.

**Key Features**:
- Linen inventory management (incoming/returns tracking)
- Lost & found item registration
- Room maintenance logging
- Staff communication (board, chat)
- Work hour tracking
- Order request system
- Notice board for announcements

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack**:
- **Vanilla JavaScript (ES Modules)** - No framework dependencies, uses modern ESM imports via CDN
- **Firebase SDK v10.12.0** - Authentication, Firestore database, and Storage via CDN imports
- **Progressive Web App** - Service Worker caching, manifest.json, installable on iOS/Android
- **Futuristic UI Design** - Glass morphism, CSS variables-based design tokens, Three.js background animations (planned)

**Design System**:
- CSS custom properties (variables) for theming in `common.css`
- Separate style modules: `tokens.css`, `layout.css`, `components.css`
- Dark mode primary interface with light mode alternative
- Typography: Inter (UI), Orbitron (headings/display), JetBrains Mono (technical data)
- Responsive mobile-first design

**Page Structure**:
- `index.html` - Landing page with PWA installation prompt
- `signup.html` - Authentication (login/signup toggle)
- `board.html` - Bulletin board with pinned posts
- `chat.html` - Real-time messaging with image upload
- `incoming_form.html` - Linen incoming registration
- `return_form.html` - Linen return registration
- `history_dashboard.html` - Combined incoming/return history
- `admin_dashboard.html` - Linen statistics dashboard with date filtering
- `lost_items_list.html` - Lost item management
- `maintenance_list.html` - Room maintenance tracking
- `orders_list.html` - Order requests management
- `worklog.html` - Staff work hour logging
- `notices.html` - Announcement viewing
- `notices_admin.html` - Admin notice creation
- `profile.html` - User profile management
- `admin.html` - Admin statistics overview

**Common Components**:
- `header.html` / `header.js` - Sticky navigation with hamburger menu, dynamically loaded
- `auth.js` - Global authentication guard, redirects based on login state
- `storage.js` - Firebase configuration and service exports

### Authentication & Authorization

**Firebase Authentication**:
- Email/password authentication
- Display name support for user profiles
- Auth state persistence across sessions
- Auto-redirect logic: logged-in users → board, logged-out users → signup

**Access Control**:
- Page-level protection via `auth.js` (runs on all protected pages)
- Admin UID whitelist in `chat.js` for message deletion privileges
- Firestore security rules expected (not in repository, managed server-side)
- User can only edit/delete own posts/items

### Data Management

**Firestore Collections**:
- `board` - Bulletin board posts with pinning support
- `messages` - Chat messages with optional image URLs
- `incoming` - Linen incoming records with normalized names
- `returns` - Linen return records with normalized names
- `lostItems` - Lost & found items with photos and status
- `maintenance` - Room maintenance logs with photos
- `orders` - Purchase/supply order requests
- `worklogs` - Staff clock-in/out records
- `notices` - Admin announcements with importance flag

**Data Normalization**:
- Official linen name list enforced via `normalizeLinenName()` function
- Standardizes variations (e.g., spacing differences) to canonical names:
  - "싱글 이불 커버", "싱글 매트 커버", "더블 이불 커버", etc.
- Applied in incoming/return forms to ensure consistent reporting

**Legacy Schema Support**:
- Dual Firebase project support (`appOld` in `history_dashboard_fast.js`)
- Backward-compatible field mapping for migrated data
- Handles both old and new timestamp formats

### State Management

**Client-Side Caching**:
- In-memory array caching (`allData`) in dashboard views
- Reduces Firestore reads during filtering/sorting operations
- Cache invalidated on CRUD operations

**Real-Time Updates**:
- Firestore `onSnapshot()` listeners for chat messages
- Automatic UI updates without page refresh
- Auth state listener for login status changes

### File Upload & Storage

**Firebase Storage Integration**:
- Image uploads for chat, lost items, and maintenance logs
- Path structure: `lost_items/`, `maintenance/`, `chat_images/`
- Timestamped filenames to prevent collisions
- Preview generation before upload
- Download URL retrieval for Firestore references

### Export Functionality

**Planned Export Features** (referenced in dashboard):
- CSV export via client-side serialization
- Excel export using SheetJS (xlsx library)
- PDF export using jsPDF + autoTable plugin

### Progressive Web App Features

**Service Worker** (`service-worker.js`):
- Cache strategy: Network-first with fallback
- Core assets cached for offline support
- Dynamic page caching on visit
- Version-based cache management (`haru-v2.0.0`)

**Manifest** (`manifest.json`):
- App name: "HARU 호텔 관리 시스템"
- Standalone display mode
- Icons: 192x192 and 512x512
- Dark theme color (#0a0e14)
- Korean language localization

**Installation Prompt** (`install.js`):
- Custom install banner on capable browsers
- User choice persistence (install/dismiss)
- Event tracking for installation analytics

### Backend Architecture

**Simple HTTP Server** (`server.js`):
- Node.js HTTP server for local development
- Static file serving with MIME type detection
- No build process required
- Port configuration via environment variable

**Note**: This is a client-heavy architecture. All business logic runs in the browser. Firestore security rules (not in repo) handle server-side validation.

## External Dependencies

### Firebase Services

**Firebase Project**:
- Project ID: `return-linen-management`
- Region: Default (implicit from config)
- Authentication: Email/Password provider enabled
- Firestore: NoSQL document database
- Storage: File/image storage bucket

**Firebase SDK** (v10.12.0 via CDN):
- `firebase-app` - Core initialization
- `firebase-auth` - User authentication
- `firebase-firestore` - Database operations
- `firebase-storage` - File uploads

**Configuration** (`storage.js`):
```javascript
apiKey: "AIzaSyAyD0Gn5-zqzPzdXjQzZhVlMQvqTzUmHKs"
authDomain: "return-linen-management.firebaseapp.com"
projectId: "return-linen-management"
storageBucket: "return-linen-management.firebasestorage.app"
```

### Third-Party Libraries

**Google Fonts**:
- Inter (400, 500, 600, 700, 900) - UI text
- Orbitron (700, 900) - Display headings
- Material Symbols Outlined - Icon font

**Planned Integrations**:
- **Three.js** - 3D background animations (referenced in design guidelines, not yet implemented)
- **SheetJS (xlsx)** - Excel export functionality (planned)
- **jsPDF + autoTable** - PDF generation (planned)

### Development Dependencies

**Drizzle ORM** (configured but not actively used):
- `drizzle-orm` v0.39.1
- `drizzle-kit` for migrations
- PostgreSQL dialect configured
- Schema location: `./shared/schema.ts`
- **Note**: Repository uses Firebase Firestore exclusively; Drizzle config suggests future SQL migration or parallel setup

**Build Tools** (React/Vite setup exists but unused):
- Vite v5.x with React plugin
- TypeScript configuration present
- Tailwind CSS configured
- shadcn/ui components library
- **Note**: These appear to be boilerplate from project template; actual app uses vanilla JS

**Node.js Packages** (package.json):
- Express-related packages present but not used (app runs on simple HTTP server)
- React ecosystem (unused in current vanilla JS implementation)
- Session management packages (unused)

### Hosting & Deployment

**Expected Deployment**:
- Static file hosting (Firebase Hosting, Netlify, Vercel, or Replit)
- No server-side rendering or API routes
- All authentication/database via Firebase client SDK
- HTTPS required for PWA features and service workers

### Browser Requirements

**Minimum Support**:
- ES Modules (ESM) via `<script type="module">`
- Service Worker API
- CSS custom properties
- Fetch API
- LocalStorage for auth persistence
- File API for image uploads

**Optimal Experience**:
- Modern Chrome/Edge/Safari/Firefox (last 2 versions)
- iOS Safari 13+ for PWA installation
- Android Chrome 80+ for full PWA features