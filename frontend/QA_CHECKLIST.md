# CRM Frontend Refactoring - QA Checklist
## Post Database Schema Upgrade

### ✅ COMPLETED PHASES
- [x] Phase 1: New Database → Frontend Types Mapping
- [x] Phase 2: Update API Layer
- [x] Phase 3: Update UI Components (Leads Module)
- [x] Phase 4: Update Hooks and SWR Queries
- [x] Phase 5: Fix All TypeScript Errors

---

## 🔍 PHASE 6: UI COMPATIBILITY TESTING

### LEADS MODULE TESTING

#### Lead Creation
- [ ] Create lead with basic info (name, email, phone)
- [ ] Create lead with custom fields (JSON object)
- [ ] Create lead with UTM parameters
- [ ] Create lead with assigned user
- [ ] Create lead with pipeline assignment
- [ ] Verify status defaults to NEW
- [ ] Verify source defaults to MANUAL
- [ ] Verify platform_source defaults to MANUAL

#### Lead Update
- [ ] Update lead basic information
- [ ] Change lead status (NEW → IN_PROGRESS → FOLLOW_UP → etc.)
- [ ] Assign lead to different user
- [ ] Change pipeline assignment
- [ ] Update custom fields
- [ ] Archive lead with reason
- [ ] Verify updated_at timestamp changes

#### Lead Status Management
- [ ] Change status from NEW to IN_PROGRESS
- [ ] Change status from IN_PROGRESS to FOLLOW_UP
- [ ] Change status from FOLLOW_UP to NOT_ANSWERING
- [ ] Change status from NOT_ANSWERING to CLOSED
- [ ] Change status from CLOSED to WON
- [ ] Change status from CLOSED to LOST
- [ ] Change status from any status to INTERESTED
- [ ] Verify status badges display correctly

#### Lead Assignment & Transfer
- [ ] Assign lead to sales user
- [ ] Transfer lead to different user
- [ ] Verify transfer notes are saved
- [ ] Verify transfer timestamps are recorded
- [ ] Verify ownership changes in UI

#### Lead Pipeline Management
- [ ] Move lead to different pipeline
- [ ] Verify pipeline stages display correctly
- [ ] Verify pipeline changes are saved
- [ ] Verify pipeline filtering works

#### Lead Filtering & Search
- [ ] Filter by status (all statuses)
- [ ] Filter by platform source (META, TIKTOK, GOOGLE_ADS, etc.)
- [ ] Filter by owner
- [ ] Filter by campaign
- [ ] Filter by archived/active status
- [ ] Search by name, email, phone
- [ ] Combine multiple filters
- [ ] Verify pagination works with filters

#### Lead Table Display
- [ ] Verify all columns display correctly
- [ ] Verify status badges with correct colors
- [ ] Verify source badges with correct colors
- [ ] Verify pipeline names display
- [ ] Verify custom fields preview (first 2 fields)
- [ ] Verify archived leads show archive reason
- [ ] Verify owner names display
- [ ] Verify campaign names display

#### Lead Details View
- [ ] Open lead drawer/profile
- [ ] Verify all fields display correctly
- [ ] Verify custom fields display as JSON
- [ ] Verify raw_payload displays in collapsible section
- [ ] Verify UTM fields in Attribution tab
- [ ] Verify activity timeline
- [ ] Verify attached files
- [ ] Verify meetings list
- [ ] Verify price offers list

### ACTIVITIES MODULE TESTING

#### Activity Creation
- [ ] Create CALL activity
- [ ] Create MESSAGE activity
- [ ] Create MEETING activity
- [ ] Create NOTE activity
- [ ] Verify activity types display correctly
- [ ] Verify due dates work
- [ ] Verify completion status

#### Activity Management
- [ ] Mark activity as done
- [ ] Update activity content
- [ ] Filter activities by type
- [ ] Filter activities by lead
- [ ] Filter activities by user
- [ ] Verify activity feed displays correctly

### MEETINGS MODULE TESTING

#### Meeting Creation
- [ ] Schedule meeting with lead
- [ ] Set meeting title, date, duration
- [ ] Add participants and notes
- [ ] Verify meeting status defaults to SCHEDULED

#### Meeting Management
- [ ] Update meeting details
- [ ] Change meeting status to DONE
- [ ] Change meeting status to CANCELLED
- [ ] Verify meeting list displays correctly
- [ ] Verify meeting filtering works

### PRICE OFFERS MODULE TESTING

#### Price Offer Creation
- [ ] Create price offer for lead
- [ ] Set amount, currency, description
- [ ] Set valid_until date
- [ ] Verify status defaults to PENDING

#### Price Offer Management
- [ ] Update price offer details
- [ ] Change status to ACCEPTED
- [ ] Change status to REJECTED
- [ ] Verify price offer list displays correctly
- [ ] Verify price offer filtering works

### FILES MODULE TESTING

#### File Upload
- [ ] Upload image file
- [ ] Upload document file
- [ ] Upload other file types
- [ ] Verify file types are detected correctly
- [ ] Verify files attach to leads

#### File Management
- [ ] View uploaded files
- [ ] Download files
- [ ] Delete files
- [ ] Filter files by type
- [ ] Filter files by lead
- [ ] Filter files by uploader

### INTEGRATIONS MODULE TESTING

#### Integration Setup
- [ ] Connect Meta integration
- [ ] Connect TikTok integration
- [ ] Connect Google Ads integration
- [ ] Verify integration status changes to CONNECTED
- [ ] Verify integration metrics update

#### Integration Management
- [ ] View integration details
- [ ] Disconnect integration
- [ ] Reconnect integration
- [ ] Verify webhook status
- [ ] Verify integration filtering

#### Integration Data Sync
- [ ] Trigger manual sync
- [ ] Verify leads import correctly
- [ ] Verify campaign data imports
- [ ] Verify ad spend data imports
- [ ] Verify sync status displays correctly

### CAMPAIGNS MODULE TESTING

#### Campaign Creation
- [ ] Create campaign with basic info
- [ ] Set budget and cost per lead
- [ ] Assign ad source
- [ ] Verify platform types work correctly

#### Campaign Management
- [ ] Update campaign details
- [ ] View campaign analytics
- [ ] Filter campaigns by status
- [ ] Filter campaigns by platform
- [ ] Verify campaign-leads relationship

### USERS & TEAMS MODULE TESTING

#### User Management
- [ ] Create new user
- [ ] Update user details
- [ ] Change user role
- [ ] Assign user to team
- [ ] Deactivate/reactivate user

#### Team Management
- [ ] Create new team
- [ ] Update team details
- [ ] Assign users to teams
- [ ] Verify team-lead relationships

### DASHBOARD & ANALYTICS TESTING

#### Overview Dashboard
- [ ] Verify lead counts by status
- [ ] Verify lead counts by source
- [ ] Verify conversion rates
- [ ] Verify team performance metrics

#### Analytics Pages
- [ ] Leads by source chart
- [ ] Cost per lead analysis
- [ ] Pipeline conversion funnel
- [ ] Team performance reports
- [ ] Campaign ROI analysis

### CROSS-MODULE INTEGRATION TESTING

#### Lead Journey Testing
- [ ] Create lead → Assign → Add activity → Schedule meeting → Create price offer → Close deal
- [ ] Verify all relationships maintain integrity
- [ ] Verify data flows correctly between modules

#### Data Consistency Testing
- [ ] Verify foreign key relationships
- [ ] Verify cascade updates work
- [ ] Verify data integrity constraints
- [ ] Verify enum values are valid

### PERFORMANCE TESTING

#### Loading Performance
- [ ] Leads table loads within 2 seconds
- [ ] Lead details load within 1 second
- [ ] Filters apply within 500ms
- [ ] Search results return within 1 second

#### Memory Usage
- [ ] No memory leaks in long sessions
- [ ] Large datasets (1000+ leads) handle correctly
- [ ] File uploads don't cause memory issues

### RESPONSIVE DESIGN TESTING

#### Mobile Testing
- [ ] Leads table responsive on mobile
- [ ] Lead forms work on mobile
- [ ] Filters accessible on mobile
- [ ] Touch interactions work correctly

#### Tablet Testing
- [ ] Medium screen layouts work
- [ ] Touch and mouse interactions both work

#### Desktop Testing
- [ ] Large screen layouts utilize space well
- [ ] Multi-column layouts work
- [ ] Keyboard navigation works

### BROWSER COMPATIBILITY TESTING

#### Chrome/Edge
- [ ] All features work correctly
- [ ] File uploads work
- [ ] Real-time updates work

#### Firefox
- [ ] All features work correctly
- [ ] File uploads work
- [ ] Real-time updates work

#### Safari
- [ ] All features work correctly
- [ ] File uploads work
- [ ] Real-time updates work

### ERROR HANDLING TESTING

#### Network Errors
- [ ] Handle API timeouts gracefully
- [ ] Handle network disconnections
- [ ] Retry failed requests appropriately

#### Validation Errors
- [ ] Display field validation errors
- [ ] Prevent invalid data submission
- [ ] Show helpful error messages

#### Permission Errors
- [ ] Handle unauthorized access
- [ ] Show appropriate permission messages
- [ ] Redirect to login when needed

---

## 📋 TESTING CHECKLIST SUMMARY

### Critical Path Tests (Must Pass)
- [ ] Lead creation with all new fields
- [ ] Lead status changes
- [ ] Lead assignment and transfer
- [ ] Pipeline management
- [ ] Integration connections
- [ ] Data import/sync functionality

### Performance Tests (Must Pass)
- [ ] Page load times < 3 seconds
- [ ] API response times < 1 second
- [ ] Large dataset handling
- [ ] Memory usage stability

### Compatibility Tests (Must Pass)
- [ ] Chrome/Edge/Safari/Firefox support
- [ ] Mobile/tablet/desktop responsive
- [ ] All screen sizes work correctly

### Data Integrity Tests (Must Pass)
- [ ] All relationships maintain integrity
- [ ] Enum values are valid
- [ ] Required fields enforced
- [ ] Data types correct

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] All TypeScript errors resolved
- [ ] All build processes pass
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] SSL certificates valid

### Post-Deployment
- [ ] Application starts successfully
- [ ] Database connections work
- [ ] API endpoints respond
- [ ] Real-time features work
- [ ] File uploads work
- [ ] Integration webhooks work

### Rollback Plan
- [ ] Database backup available
- [ ] Previous version deployable
- [ ] Feature flags for gradual rollout
- [ ] Monitoring alerts configured

---

## 📊 SUCCESS CRITERIA

### Functional Completeness: 100%
- All new schema fields implemented in UI
- All new relationships working
- All new enum values supported
- All new API endpoints integrated

### Performance: >95%
- Load times within acceptable ranges
- No memory leaks
- Smooth user interactions
- Efficient data fetching

### Compatibility: 100%
- All target browsers supported
- All screen sizes work
- All devices supported
- All integration platforms work

### Data Integrity: 100%
- No data loss during migration
- All constraints enforced
- All relationships valid
- All business rules maintained

---

*Generated: November 21, 2025*
*Refactoring completed for CRM system database schema upgrade*