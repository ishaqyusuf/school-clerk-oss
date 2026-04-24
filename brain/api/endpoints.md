# API Endpoints

## Purpose
Catalog of API routes and responsibilities.

## How To Use
- Update when endpoints are added, removed, or changed.
- Keep route ownership and tenant scope explicit.
- Link contracts and permissions docs.

## Template
## Domain Endpoints
### Student Management
- `GET /students`
- `POST /students`
- `GET /students/:id`
- `PATCH /students/:id`

### Admissions
- `GET /admissions`
- `POST /admissions`

### Attendance
- `GET /attendance`
- `POST /attendance`

### Exams and Results
- `GET /results`
- `POST /results`

### External Examinations
- `GET /external-exam-bodies`
- `POST /external-exam-bodies`
- `GET /external-exams`
- `POST /external-exams`
- `POST /external-exams/:examId/candidates`
- `POST /external-exams/:examId/candidates/bulk`
- `PATCH /external-exams/:examId/candidates/:candidateId/status`
- `POST /external-exams/:examId/candidates/:candidateId/subjects`
- `POST /external-exams/:examId/candidates/:candidateId/payment`
- `POST /external-exams/:examId/candidates/:candidateId/submit`
- `POST /external-exams/:examId/results`
- `GET /external-exams/:examId/analytics`
- `GET /external-exams/:examId/exports/candidates`

### Billing and Payments
- `GET /invoices`
- `POST /invoices`
- `POST /payments`
- `trpc.finance.getStreams`
- `trpc.finance.getStreamDetails`
- `trpc.finance.transferFunds`
- `trpc.finance.getServicePayments`
- `trpc.finance.payServiceBill`
- `trpc.finance.cancelServiceBillPayment`
- `trpc.finance.getPayroll`
- `trpc.finance.payStaffBill`
- `trpc.finance.cancelStaffBillPayment`
- `trpc.finance.receiveStudentPayment`
- `trpc.finance.reverseStudentPayment`

### Notifications
- `trpc.notifications.list`
- `trpc.notifications.unreadCount`
- `trpc.notifications.markRead`
- `trpc.notifications.markAllRead`

### Staff Management
- `trpc.staff.getStaffList`
- `trpc.staff.getFormData`
- `trpc.staff.createStaff`
- `trpc.staff.deleteStaff`
- `action.saveStaffAction`
- `action.resendStaffOnboardingAction`
- `action.completeStaffOnboardingAction`

### PDF Output
- `GET /api/pdf/student-payment-receipt`
- `GET /api/pdf/result`

### AI Assistant
- `POST /api/chat`
- `GET /api/chat/conversations`
- `POST /api/chat/conversations`
- `GET /api/chat/conversations/:conversationId`
- `POST /api/chat/conversations/:conversationId/messages`
- `GET /api/chat/settings`
- `POST /api/chat/settings`
- `GET /api/chat/analytics`
- `POST /api/chat/feedback`

## Router Ownership Map
- `trpc.students.*`: student listing, detail, overview, and student-centric workflows
- `trpc.classrooms.*`: classroom lists, overview, and classroom-scoped actions
- `trpc.academics.*`: academic session, term, enrollment, and promotion flows
- `trpc.transactions.*`: fee definitions, fee imports, and other transaction-oriented finance writes
- `trpc.finance.*`: streams, bills, payroll, receive-payment, and finance reporting workflows
- `trpc.attendance.*`: classroom attendance capture and student attendance history
- `trpc.staff.*`: staff list/form data and staff-management APIs
- `trpc.notifications.*`: notification list/read/count actions
- `trpc.subjects.*`, `trpc.enrollments.*`, `trpc.assessments.*`, `trpc.filters.*`, `trpc.auth.*`: domain-specific supporting routers
- `app/api/chat/*`: dashboard assistant history, execution, settings, analytics, and feedback surfaces
