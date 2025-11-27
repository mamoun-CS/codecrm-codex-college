# Lead Management System - Component Structure

## Overview
This document outlines the component structure and hierarchy for the enhanced lead management system frontend.

## Component Hierarchy

### Main Application Structure
```
frontend/src/
├── app/
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Dashboard/home page
│   ├── leads/
│   │   ├── page.tsx              # Leads listing with filters & kanban
│   │   └── [id]/
│   │       └── page.tsx          # Lead detail/profile page
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── accounts/page.tsx
├── components/
│   ├── KanbanBoard.tsx           # Main kanban board container
│   ├── KanbanColumn.tsx          # Individual kanban columns
│   ├── KanbanCard.tsx            # Lead cards in kanban view
│   ├── LeadTransferModal.tsx     # Lead transfer functionality
│   ├── SalesSidebar.tsx          # Sales team sidebar
│   └── TransferSidebar.tsx       # Lead transfer sidebar
└── lib/
    └── api.ts                    # API client with all endpoints
```

## Component Details

### 1. Leads Page (`/leads/page.tsx`)
**Purpose**: Main leads management interface with dual view modes (table/kanban)

**Features**:
- Advanced filtering system (source, campaign, status, owner, language, date range, search)
- Table view with sortable columns and bulk actions
- Kanban board integration
- Export functionality (CSV/Excel)
- Bulk edit capabilities
- Lead creation and editing modals

**State Management**:
- `leads`: Array of lead objects
- `filters`: AdvancedFilters object
- `viewMode`: 'table' | 'kanban'
- `selectedLeads`: Set for bulk operations
- `pagination`: Page/limit/total tracking

### 2. Lead Detail Page (`/leads/[id]/page.tsx`)
**Purpose**: Comprehensive lead profile with timeline and management tools

**Features**:
- Lead information editing
- Timeline view showing complete activity history
- Tabbed interface (Tasks, Files, Notes, Price Offers, Meetings, Emails, SMS)
- Task management system
- File attachments
- Communication history (emails, SMS, calls)
- Meeting scheduling
- Price offer management

**State Management**:
- `lead`: Current lead object
- `activeTab`: Current tab selection
- `tasks`: Array of task objects
- `notes`: Array of note objects
- Various form states for different functionalities

### 3. KanbanBoard Component
**Purpose**: Drag-and-drop kanban board for visual lead pipeline management

**Features**:
- Drag & drop between stages
- Stage statistics display
- Bulk actions for multiple leads
- Real-time visual feedback
- Priority indicators on cards

**Props**:
- `leads`: Lead array
- `onLeadUpdate`: Status update callback
- `onLeadClick`: Navigation callback

### 4. KanbanColumn Component
**Purpose**: Individual pipeline stage columns

**Features**:
- Drop zone for lead cards
- Lead count display
- Visual stage indicators
- Card rendering

### 5. KanbanCard Component
**Purpose**: Individual lead representation in kanban view

**Features**:
- Drag handle
- Priority color coding
- Quick action buttons (call, WhatsApp, email)
- Selection checkbox for bulk operations
- Contact information display
- Source and campaign badges

## Data Models

### Lead Interface
```typescript
interface Lead {
  id: number;
  full_name: string;
  phone?: string;
  email?: string;
  country?: string;
  city?: string;
  language?: string;
  source?: string;
  status?: string;
  created_at: string;
  campaign?: { id: number; name: string };
  owner?: { id: number; name: string };
  notes?: LeadNote[];
}
```

### Task Interface
```typescript
interface Task {
  id: number;
  title: string;
  description?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  assigned_to?: { id: number; name: string };
  created_by: { id: number; name: string };
  created_at: string;
  updated_at: string;
}
```

### Advanced Filters
```typescript
interface AdvancedFilters {
  source: string;
  campaign: string;
  status: string;
  owner: string;
  language: string;
  dateRange: string;
  startDate: string;
  endDate: string;
  search: string;
}
```

## API Integration

### Leads API Endpoints
- `GET /leads` - List leads with filters
- `GET /leads/:id` - Get lead details
- `POST /leads` - Create lead
- `PATCH /leads/:id` - Update lead
- `DELETE /leads/:id` - Delete lead
- `POST /leads/transfer` - Transfer lead ownership

### Tasks API Endpoints
- `GET /leads/:id/tasks` - Get lead tasks
- `POST /leads/:id/tasks` - Create task
- `PUT /leads/:id/tasks/:taskId` - Update task
- `DELETE /leads/:id/tasks/:taskId` - Delete task

### Export API Endpoints
- `GET /leads/export/csv` - Export to CSV
- `GET /leads/export/excel` - Export to Excel

## Key Features Implemented

### 1. Advanced Filtering System
- **Source Filter**: Facebook Ads, Google Ads, TikTok, WhatsApp, Website, Phone Call, Landing Page, Email, Referral
- **Campaign Filter**: Filter by specific advertising campaigns
- **Status Filter**: New, Contacted, Meeting Scheduled, Proposal Sent, Closed Won, Closed Lost
- **Owner Filter**: Filter by assigned sales representative
- **Language Filter**: Arabic, English, French, Spanish, etc.
- **Date Range Filter**: Today, Yesterday, Last 7 days, This month, Custom range
- **Advanced Search**: Search by name, phone, email, notes

### 2. Kanban Pipeline Board
- **Drag & Drop**: Move leads between stages
- **Visual Indicators**: Priority colors, overdue items, new leads
- **Card Preview**: Quick view of lead details
- **Bulk Actions**: Move multiple leads between stages
- **Stage Statistics**: Count of leads in each stage

### 3. Lead Profile/File Page
- **Timeline View**: Complete history with creation, status changes, notes, communications
- **Tasks Management**: Create, assign, track tasks with priorities and due dates
- **Communication History**: WhatsApp, phone calls, emails, SMS logs
- **File Attachments**: Upload and manage documents, images, contracts
- **Notes Section**: Rich text notes with categorization

### 4. Export & Bulk Operations
- **CSV/Excel Export**: Filtered data export with current filters applied
- **Bulk Edit**: Update multiple leads simultaneously (status, owner, campaign)
- **Bulk Selection**: Checkbox interface for selecting multiple leads

## Technical Implementation Notes

### State Management
- React hooks for local component state
- Props drilling for parent-child communication
- Callback functions for data updates

### UI/UX Patterns
- Responsive design with Tailwind CSS
- Modal dialogs for forms and confirmations
- Toast notifications for user feedback
- Loading states and error handling

### Performance Considerations
- Pagination for large datasets
- Efficient re-rendering with React keys
- Lazy loading for heavy components
- Optimized API calls with proper caching

## Future Enhancements

### Landing Page Builder (Option A: Built-in Builder)
- Pre-built sections (Hero, Contact Form, Features, Testimonials, FAQ, Footer)
- Drag & drop section arrangement
- Customization options (colors, fonts, images)
- Live preview and mobile responsiveness testing

### WordPress Integration (Option B)
- Connect existing WordPress sites
- Form integration for lead capture
- UTM parameter tracking
- Auto-sync leads from WordPress forms

### Additional Features
- Keyboard shortcuts for Kanban navigation
- Advanced analytics and reporting
- Automated workflows and triggers
- Integration with external CRM systems