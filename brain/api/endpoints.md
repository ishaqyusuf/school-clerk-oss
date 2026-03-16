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

### Notifications
- `POST /notifications`
