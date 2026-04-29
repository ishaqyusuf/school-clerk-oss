-- CreateEnum
CREATE TYPE "ActivitySource" AS ENUM ('user', 'system');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('wallet_created', 'student_fee_created', 'student_fee_cancelled', 'student_payment_received', 'student_payment_refund', 'student_payment_cancelled', 'student_payment_transaction_cancelled', 'student_payment_transaction_created', 'student_term_created', 'student_term_cancelled', 'assistant_run', 'assistant_action_requested', 'assistant_action_completed', 'assistant_action_blocked');

-- CreateEnum
CREATE TYPE "AssistantConversationStatus" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "AssistantMessageRole" AS ENUM ('user', 'assistant', 'system');

-- CreateEnum
CREATE TYPE "AssistantRunStatus" AS ENUM ('running', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "AssistantToolExecutionStatus" AS ENUM ('started', 'completed', 'blocked', 'failed');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('success', 'cancelled', 'failed', 'draft');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('credit', 'debit');

-- CreateEnum
CREATE TYPE "WalletType" AS ENUM ('Bill', 'Fee');

-- CreateEnum
CREATE TYPE "BillType" AS ENUM ('SALARY', 'MISC', 'OTHER');

-- CreateEnum
CREATE TYPE "BillSettlementStatus" AS ENUM ('paid', 'paid_with_owing', 'settled', 'cancelled');

-- CreateEnum
CREATE TYPE "InventoryType" AS ENUM ('SUPPLY', 'TEXTBOOK', 'EQUIPMENT', 'UNIFORM', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationVisibility" AS ENUM ('public', 'private');

-- CreateEnum
CREATE TYPE "NotificationRecipientStatus" AS ENUM ('unread', 'read', 'archived');

-- CreateEnum
CREATE TYPE "NotificationContactRole" AS ENUM ('user', 'staff', 'student', 'guardian');

-- CreateEnum
CREATE TYPE "CollectionStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'WAIVED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "StudentPaymentType" AS ENUM ('FEE', 'PURCHASE');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('Male', 'Female');

-- CreateEnum
CREATE TYPE "WebsiteTemplateConfigStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "batch_staff_service" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR,
    "note" VARCHAR,
    "school_id" UUID NOT NULL,
    "total_amount" DECIMAL DEFAULT 0,
    "term_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),
    "updatedAt" TIMESTAMPTZ(6),

    CONSTRAINT "batch_staff_service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billable_service" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "title" VARCHAR,
    "amount" DECIMAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),
    "updatedAt" TIMESTAMPTZ(6),

    CONSTRAINT "billable_service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_wallet" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "balance" DECIMAL DEFAULT 0.00,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),
    "updatedAt" TIMESTAMPTZ(6),

    CONSTRAINT "school_wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "payment_type" VARCHAR,
    "transaction_type" VARCHAR,
    "headline" VARCHAR,
    "description" VARCHAR,
    "amount" DECIMAL NOT NULL,
    "coupon" BOOLEAN DEFAULT false,
    "academic_term_id" UUID NOT NULL,
    "student_term_id" UUID,
    "staff_term_id" UUID,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),
    "updatedAt" TIMESTAMPTZ(6),

    CONSTRAINT "transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_result" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assessment_id" UUID NOT NULL,
    "score" DECIMAL,
    "percentage" DECIMAL,
    "student_term_sheet_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),
    "updatedAt" TIMESTAMPTZ(6),

    CONSTRAINT "assessment_result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "class_subject_id" UUID NOT NULL,
    "description" VARCHAR,
    "obtainable" DECIMAL,
    "teacher_id" UUID NOT NULL,
    "term_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),
    "updatedAt" TIMESTAMPTZ(6),

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_subject" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "academic_session_id" UUID NOT NULL,
    "academic_class_id" UUID NOT NULL,
    "session_class_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),
    "updatedAt" TIMESTAMPTZ(6),

    CONSTRAINT "class_subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subjects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(256) NOT NULL,
    "school_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),
    "updatedAt" TIMESTAMPTZ(6),

    CONSTRAINT "Subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExampleClassRoom" (
    "id" SERIAL NOT NULL,
    "classCode" TEXT NOT NULL,
    "classTitle" TEXT NOT NULL,
    "classGroupCode" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ExampleSubject" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "code" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ExampleClassSubjects" (
    "id" SERIAL NOT NULL,
    "classGroupCode" TEXT NOT NULL,
    "subjectCode" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ExampleSubjectsOnClassRooms" (
    "id" SERIAL NOT NULL,
    "classRoomSubjectId" INTEGER,
    "classRoomId" INTEGER
);

-- CreateTable
CREATE TABLE "ExampleStudents" (
    "id" SERIAL NOT NULL,
    "studentCode" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "fathersName" TEXT NOT NULL,
    "otherName" TEXT,
    "classCode" TEXT NOT NULL,
    "studentString" TEXT NOT NULL,
    "performanceRemarkId" INTEGER,
    "exampleClassId" INTEGER
);

-- CreateTable
CREATE TABLE "ExampleClassSubjectAssessment" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "obtainable" DOUBLE PRECISION NOT NULL,
    "subjectsOnClassRoomsId" INTEGER
);

-- CreateTable
CREATE TABLE "ExampleStudentSubjectAssessment" (
    "id" SERIAL NOT NULL,
    "subjectsOnClassRoomsId" INTEGER,
    "studentId" INTEGER,
    "obtained" DOUBLE PRECISION,
    "percentageScore" DOUBLE PRECISION
);

-- CreateTable
CREATE TABLE "ExampleStudentAssessment" (
    "id" SERIAL NOT NULL,
    "obtained" DOUBLE PRECISION,
    "percentageScore" DOUBLE PRECISION,
    "classSubjectsId" INTEGER,
    "studentId" INTEGER,
    "classSubjectAssessmentId" INTEGER,
    "remarkOnAssementId" INTEGER,
    "studentSubjectAssessmentId" INTEGER
);

-- CreateTable
CREATE TABLE "ExampleRemarkOnSubjectAssessment" (
    "id" SERIAL NOT NULL,
    "remarksId" INTEGER
);

-- CreateTable
CREATE TABLE "ExampleRemarkOnAssessment" (
    "id" SERIAL NOT NULL,
    "remarksId" INTEGER
);

-- CreateTable
CREATE TABLE "ExampleRemarkOnStudentPerformance" (
    "id" SERIAL NOT NULL,
    "percentage" DOUBLE PRECISION,
    "remarksId" INTEGER
);

-- CreateTable
CREATE TABLE "ExampleRemarks" (
    "id" SERIAL NOT NULL,
    "remarkAr" TEXT,
    "remarkEn" TEXT
);

-- CreateTable
CREATE TABLE "ExampleStudentPayments" (
    "id" SERIAL NOT NULL,
    "amount" DOUBLE PRECISION,
    "summary" TEXT,
    "exampleStudentsId" INTEGER
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "title" VARCHAR,
    "type" VARCHAR,
    "amount" DECIMAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),
    "updatedAt" TIMESTAMPTZ(6),

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_sales" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "title" VARCHAR,
    "book_id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),
    "updatedAt" TIMESTAMPTZ(6),

    CONSTRAINT "inventory_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_class" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(256) NOT NULL,
    "school_id" UUID NOT NULL,
    "classLevel" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),
    "updatedAt" TIMESTAMPTZ(6),

    CONSTRAINT "academic_class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_session" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(256) NOT NULL,
    "start_date" TIMESTAMP(6),
    "end_date" TIMESTAMP(6),
    "school_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),
    "updatedAt" TIMESTAMPTZ(6),

    CONSTRAINT "academic_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_term" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(256) NOT NULL,
    "school_id" UUID NOT NULL,
    "academic_session_id" UUID NOT NULL,
    "start_date" TIMESTAMP(6),
    "end_date" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),
    "updatedAt" TIMESTAMPTZ(6),

    CONSTRAINT "academic_term_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_class_role" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "staff_id" UUID NOT NULL,
    "session_class_id" UUID NOT NULL,
    "role" VARCHAR,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),
    "updatedAt" TIMESTAMPTZ(6),

    CONSTRAINT "staff_class_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_service" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "note" VARCHAR,
    "amount" DECIMAL DEFAULT 0,
    "staff_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "term_id" UUID NOT NULL,
    "staff_tx_id" UUID,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),
    "updatedAt" TIMESTAMPTZ(6),
    "batch_service_id" UUID NOT NULL,

    CONSTRAINT "staff_service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_service_cost" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "note" VARCHAR,
    "title" VARCHAR,
    "amount" DECIMAL DEFAULT 0,
    "staff_service_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),
    "updatedAt" TIMESTAMPTZ(6),

    CONSTRAINT "staff_service_cost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_session_form" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),
    "updatedAt" TIMESTAMPTZ(6),

    CONSTRAINT "staff_session_form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_subject_role" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "staff_class_role_id" UUID NOT NULL,
    "role" VARCHAR,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),
    "updatedAt" TIMESTAMPTZ(6),

    CONSTRAINT "staff_subject_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_term_sheet" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "session_sheet_id" UUID NOT NULL,
    "academic_term_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),
    "updatedAt" TIMESTAMPTZ(6),

    CONSTRAINT "staff_term_sheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "first_name" VARCHAR(256) NOT NULL,
    "other_name" VARCHAR(256),
    "surname" VARCHAR(256) NOT NULL,
    "guardianId" UUID,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),
    "updatedAt" TIMESTAMPTZ(6),
    "gender" VARCHAR,
    "dob" TIMESTAMP(6),

    CONSTRAINT "student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_attendance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attendance_id" UUID NOT NULL,
    "present" BOOLEAN DEFAULT false,
    "comment" TEXT,
    "teacher_id" UUID NOT NULL,
    "student_term_sheet_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),
    "updatedAt" TIMESTAMPTZ(6),

    CONSTRAINT "student_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_day_attendance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_class_id" UUID NOT NULL,
    "teacher_id" UUID NOT NULL,
    "class_subject_id" UUID NOT NULL,
    "term_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),
    "updatedAt" TIMESTAMPTZ(6),

    CONSTRAINT "student_day_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_session_form" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),
    "updatedAt" TIMESTAMPTZ(6),

    CONSTRAINT "student_session_form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_term_sheet" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_sheet_id" UUID NOT NULL,
    "academic_term_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "session_class_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),
    "updatedAt" TIMESTAMPTZ(6),

    CONSTRAINT "student_term_sheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaasAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNo" TEXT,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "SaasAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "phoneNo" TEXT,
    "role" TEXT,
    "emailVerified" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "saasAccountId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "token" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "impersonatedBy" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(0),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(0),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(0),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTokenLogin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(0),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "EmailTokenLogin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "author" TEXT NOT NULL,
    "source" "ActivitySource" NOT NULL,
    "type" "ActivityType" NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "schoolProfileId" TEXT,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomSubjectAssessment" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "obtainable" DOUBLE PRECISION NOT NULL,
    "percentageObtainable" DOUBLE PRECISION DEFAULT 0,
    "index" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "departmentSubjectId" TEXT
);

-- CreateTable
CREATE TABLE "StudentAssessmentRecord" (
    "id" SERIAL NOT NULL,
    "obtained" DOUBLE PRECISION,
    "percentageScore" DOUBLE PRECISION,
    "studentId" TEXT,
    "classSubjectAssessmentId" INTEGER,
    "remarkOnAssementId" INTEGER,
    "studentTermFormId" TEXT,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0)
);

-- CreateTable
CREATE TABLE "ReportPrintLog" (
    "id" TEXT NOT NULL,
    "schoolProfileId" TEXT,
    "termId" TEXT,
    "termFormIds" TEXT[],
    "departmentIds" TEXT[],
    "printedAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportPrintLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantConversation" (
    "id" TEXT NOT NULL,
    "schoolProfileId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "title" TEXT,
    "locale" TEXT,
    "status" "AssistantConversationStatus" NOT NULL DEFAULT 'active',
    "summary" TEXT,
    "lastMessageAt" TIMESTAMP(0),
    "meta" JSONB,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "AssistantConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "schoolProfileId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "role" "AssistantMessageRole" NOT NULL,
    "content" TEXT,
    "parts" JSONB,
    "workflowState" JSONB,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "AssistantMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantRun" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "schoolProfileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AssistantRunStatus" NOT NULL DEFAULT 'running',
    "provider" TEXT,
    "model" TEXT,
    "requestType" TEXT,
    "locale" TEXT,
    "promptSummary" TEXT,
    "usage" JSONB,
    "metrics" JSONB,
    "error" TEXT,
    "workflowAction" JSONB,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "AssistantRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantToolExecution" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "schoolProfileId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "capability" TEXT,
    "status" "AssistantToolExecutionStatus" NOT NULL DEFAULT 'started',
    "isMutation" BOOLEAN NOT NULL DEFAULT false,
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(0),
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "AssistantToolExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolAssistantConfig" (
    "id" TEXT NOT NULL,
    "schoolProfileId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "preferredProvider" TEXT,
    "preferredModel" TEXT,
    "allowedRoles" JSONB,
    "enabledCapabilities" JSONB,
    "disabledCapabilities" JSONB,
    "analyticsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "feedbackEnabled" BOOLEAN NOT NULL DEFAULT true,
    "maxSteps" INTEGER NOT NULL DEFAULT 5,
    "systemPromptExtra" TEXT,
    "rolloutStage" TEXT,
    "featureFlags" JSONB,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "SchoolAssistantConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantFeedback" (
    "id" TEXT NOT NULL,
    "schoolProfileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT,
    "runId" TEXT,
    "rating" INTEGER,
    "comment" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "AssistantFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassRoom" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "classLevel" DOUBLE PRECISION,
    "schoolProfileId" TEXT NOT NULL,
    "schoolSessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "ClassRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassRoomDepartment" (
    "id" TEXT NOT NULL,
    "departmentName" TEXT,
    "classRoomsId" TEXT,
    "schoolProfileId" TEXT,
    "departmentLevel" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "ClassRoomDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartmentSubject" (
    "id" TEXT NOT NULL,
    "description" TEXT,
    "classRoomDepartmentId" TEXT,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "sessionTermId" TEXT,
    "subjectId" TEXT NOT NULL,

    CONSTRAINT "DepartmentSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "schoolProfileId" TEXT,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "defaultType" TEXT DEFAULT 'incoming',
    "schoolProfileId" TEXT,
    "sessionTermId" TEXT,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentWalletTransactions" (
    "id" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION,
    "transactionType" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'success',
    "walletTransactionId" TEXT,
    "studentId" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "StudentWalletTransactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransactions" (
    "id" TEXT NOT NULL,
    "type" TEXT,
    "summary" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "walletId" TEXT NOT NULL,
    "status" "TransactionStatus",
    "transactionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "fundId" TEXT,

    CONSTRAINT "WalletTransactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Funds" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "pendingAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "walletId" TEXT NOT NULL,

    CONSTRAINT "Funds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Billable" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "BillType",
    "amount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "schoolProfileId" TEXT NOT NULL,

    CONSTRAINT "Billable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillableHistory" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "current" BOOLEAN NOT NULL DEFAULT false,
    "feeId" TEXT NOT NULL,
    "schoolSessionId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "walletId" TEXT,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "BillableHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bills" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "invoiceId" TEXT,
    "staffTermProfileId" TEXT,
    "walletId" TEXT,
    "billPaymentId" TEXT,
    "billableId" TEXT,
    "billableHistoryId" TEXT,
    "sessionTermId" TEXT NOT NULL,
    "schoolSessionId" TEXT NOT NULL,
    "schoolProfileId" TEXT NOT NULL,

    CONSTRAINT "Bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillInvoice" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "BillInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillPayment" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "transactionId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,

    CONSTRAINT "BillPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillSettlement" (
    "id" TEXT NOT NULL,
    "requestedAmount" DOUBLE PRECISION NOT NULL,
    "fundedAmount" DOUBLE PRECISION NOT NULL,
    "owingAmount" DOUBLE PRECISION NOT NULL,
    "status" "BillSettlementStatus" NOT NULL DEFAULT 'paid',
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "billId" TEXT NOT NULL,
    "billPaymentId" TEXT NOT NULL,

    CONSTRAINT "BillSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillSettlementRepayment" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "settlementId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,

    CONSTRAINT "BillSettlementRepayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guardians" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phone2" TEXT,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "schoolProfileId" TEXT NOT NULL,

    CONSTRAINT "Guardians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "InventoryType" NOT NULL DEFAULT 'OTHER',
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lowStockAlert" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "schoolProfileId" TEXT NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryIssuance" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,
    "issuedTo" TEXT,
    "issuedDate" TIMESTAMP(0),
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "inventoryId" TEXT NOT NULL,
    "schoolProfileId" TEXT NOT NULL,

    CONSTRAINT "InventoryIssuance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "subject" TEXT,
    "headline" TEXT,
    "content" TEXT,
    "color" TEXT,
    "link" TEXT,
    "action" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "NotificationVisibility" DEFAULT 'public',
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "schoolProfileId" TEXT NOT NULL,
    "userId" TEXT,
    "authorContactId" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "inApp" BOOLEAN NOT NULL DEFAULT true,
    "email" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "schoolProfileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTag" (
    "id" TEXT NOT NULL,
    "tagName" TEXT NOT NULL,
    "tagValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "notificationId" TEXT NOT NULL,

    CONSTRAINT "NotificationTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRecipient" (
    "id" TEXT NOT NULL,
    "status" "NotificationRecipientStatus" DEFAULT 'unread',
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "readAt" TIMESTAMP(0),
    "notificationId" TEXT NOT NULL,
    "recipientContactId" TEXT NOT NULL,

    CONSTRAINT "NotificationRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationContact" (
    "id" TEXT NOT NULL,
    "role" "NotificationContactRole" NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "schoolProfileId" TEXT NOT NULL,
    "userId" TEXT,
    "staffProfileId" TEXT,
    "studentId" TEXT,
    "guardianId" TEXT,

    CONSTRAINT "NotificationContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Posts" (
    "id" SERIAL NOT NULL,
    "data" JSONB,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3)
);

-- CreateTable
CREATE TABLE "guardian" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "name" VARCHAR(256) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),
    "updatedAt" TIMESTAMPTZ(6),

    CONSTRAINT "guardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(256) NOT NULL,
    "sub_domain" VARCHAR(256) NOT NULL,
    "meta" JSONB,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),
    "updatedAt" TIMESTAMPTZ(6),

    CONSTRAINT "school_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_class" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "academic_session_id" UUID NOT NULL,
    "academic_class_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),
    "updatedAt" TIMESTAMPTZ(6),

    CONSTRAINT "session_class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subDomain" TEXT NOT NULL,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "accountId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "SchoolProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantDomain" (
    "id" TEXT NOT NULL,
    "subdomain" TEXT,
    "customDomain" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "schoolProfileId" TEXT,
    "saasAccountId" TEXT,

    CONSTRAINT "TenantDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolSession" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "schoolId" TEXT NOT NULL,
    "startDate" TIMESTAMP(0),
    "endDate" TIMESTAMP(0),

    CONSTRAINT "SchoolSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionTerm" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TIMESTAMP(0),
    "endDate" TIMESTAMP(0),
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "SessionTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "password" TEXT,
    "phone" TEXT,
    "phone2" TEXT,
    "address" TEXT,
    "inviteStatus" TEXT DEFAULT 'NOT_SENT',
    "inviteSentAt" TIMESTAMP(0),
    "inviteResentAt" TIMESTAMP(0),
    "lastInviteError" TEXT,
    "onboardedAt" TIMESTAMP(0),
    "schoolProfileId" TEXT,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "StaffProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffTermProfile" (
    "id" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "schoolSessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "sessionTermId" TEXT NOT NULL,

    CONSTRAINT "StaffTermProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffClassroomDepartmentTermProfiles" (
    "id" TEXT NOT NULL,
    "classRoomDepartmentId" TEXT,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "staffTermProfileId" TEXT NOT NULL,

    CONSTRAINT "StaffClassroomDepartmentTermProfiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffSubject" (
    "id" TEXT NOT NULL,
    "staffProfilesId" TEXT NOT NULL,
    "departmentSubjectId" TEXT,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "StaffSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassRoomAttendance" (
    "id" TEXT NOT NULL,
    "attendanceTitle" TEXT NOT NULL,
    "schoolProfileId" TEXT,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "departmentId" TEXT,
    "staffProfileId" TEXT,

    CONSTRAINT "ClassRoomAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentAttendance" (
    "id" TEXT NOT NULL,
    "isPresent" BOOLEAN DEFAULT false,
    "comment" TEXT,
    "schoolProfileId" TEXT,
    "studentTermFormId" TEXT,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "classroomAttendanceId" TEXT,
    "departmentId" TEXT,

    CONSTRAINT "StudentAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fees" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "schoolProfileId" TEXT NOT NULL,

    CONSTRAINT "Fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeHistory" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "current" BOOLEAN NOT NULL DEFAULT false,
    "feeId" TEXT NOT NULL,
    "schoolSessionId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "walletId" TEXT,
    "dueDate" TIMESTAMP(0),
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "FeeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentFee" (
    "id" TEXT NOT NULL,
    "billAmount" DOUBLE PRECISION NOT NULL,
    "pendingAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "feeTitle" TEXT,
    "description" TEXT,
    "billablePriceId" TEXT,
    "schoolProfileId" TEXT,
    "studentTermFormId" TEXT,
    "schoolSessionId" TEXT,
    "feeHistoryId" TEXT,
    "status" TEXT,
    "collectionStatus" "CollectionStatus" NOT NULL DEFAULT 'PENDING',
    "studentId" TEXT,

    CONSTRAINT "StudentFee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeDiscount" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "studentFeeId" TEXT NOT NULL,

    CONSTRAINT "FeeDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentPurchase" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paid" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "StudentPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentPayment" (
    "id" TEXT NOT NULL,
    "paymentType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "status" TEXT,
    "description" TEXT,
    "type" "StudentPaymentType" NOT NULL,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "studentBillPaymentsId" TEXT,
    "studentTermFormId" TEXT NOT NULL,
    "schoolProfileId" TEXT NOT NULL,
    "walletTransactionsId" TEXT NOT NULL,
    "studentPurchaseId" TEXT,

    CONSTRAINT "StudentPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Students" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "surname" TEXT,
    "otherName" TEXT,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "dob" TIMESTAMP(0),
    "gender" "Gender" NOT NULL,
    "schoolProfileId" TEXT,

    CONSTRAINT "Students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentGuardians" (
    "id" TEXT NOT NULL,
    "guardiansId" TEXT NOT NULL,
    "relation" TEXT,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "studentId" TEXT NOT NULL,

    CONSTRAINT "StudentGuardians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentSessionForm" (
    "id" TEXT NOT NULL,
    "studentId" TEXT,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "schoolSessionId" TEXT,
    "schoolProfileId" TEXT,
    "classroomDepartmentId" TEXT,

    CONSTRAINT "StudentSessionForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentTermForm" (
    "id" TEXT NOT NULL,
    "schoolProfileId" TEXT,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),
    "sessionTermId" TEXT,
    "schoolSessionId" TEXT,
    "studentSessionFormId" TEXT NOT NULL,
    "studentId" TEXT,
    "classroomDepartmentId" TEXT,

    CONSTRAINT "StudentTermForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteTemplateConfig" (
    "id" TEXT NOT NULL,
    "schoolProfileId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "WebsiteTemplateConfigStatus" NOT NULL DEFAULT 'DRAFT',
    "contentJson" JSONB NOT NULL,
    "sectionJson" JSONB NOT NULL,
    "themeJson" JSONB NOT NULL,
    "seoJson" JSONB,
    "analyticsJson" JSONB,
    "templateVersion" INTEGER NOT NULL DEFAULT 1,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "publishedAt" TIMESTAMP(0),
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "WebsiteTemplateConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteMediaAsset" (
    "id" TEXT NOT NULL,
    "schoolProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'IMAGE',
    "sourceUrl" TEXT NOT NULL,
    "altText" TEXT,
    "storageProvider" TEXT,
    "storageKey" TEXT,
    "mimeType" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "WebsiteMediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsitePublishedConfig" (
    "id" TEXT NOT NULL,
    "schoolProfileId" TEXT NOT NULL,
    "websiteConfigId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "WebsitePublishedConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ClassRoomDepartmentToFeeHistory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ClassRoomDepartmentToFeeHistory_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_BillableHistoryToClassRoomDepartment" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BillableHistoryToClassRoomDepartment_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "class_subject_session_class_id_subject_id_unique" ON "class_subject"("session_class_id", "subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "Subjects_name_school_id_unique" ON "Subjects"("name", "school_id");

-- CreateIndex
CREATE UNIQUE INDEX "ExampleClassRoom_id_key" ON "ExampleClassRoom"("id");

-- CreateIndex
CREATE UNIQUE INDEX "ExampleClassRoom_classCode_key" ON "ExampleClassRoom"("classCode");

-- CreateIndex
CREATE UNIQUE INDEX "ExampleClassRoom_classCode_classTitle_classGroupCode_key" ON "ExampleClassRoom"("classCode", "classTitle", "classGroupCode");

-- CreateIndex
CREATE UNIQUE INDEX "ExampleSubject_id_key" ON "ExampleSubject"("id");

-- CreateIndex
CREATE UNIQUE INDEX "ExampleSubject_code_key" ON "ExampleSubject"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ExampleSubject_title_key" ON "ExampleSubject"("title");

-- CreateIndex
CREATE UNIQUE INDEX "ExampleClassSubjects_id_key" ON "ExampleClassSubjects"("id");

-- CreateIndex
CREATE UNIQUE INDEX "ExampleClassSubjects_classGroupCode_subjectCode_key" ON "ExampleClassSubjects"("classGroupCode", "subjectCode");

-- CreateIndex
CREATE UNIQUE INDEX "ExampleSubjectsOnClassRooms_id_key" ON "ExampleSubjectsOnClassRooms"("id");

-- CreateIndex
CREATE UNIQUE INDEX "ExampleSubjectsOnClassRooms_classRoomSubjectId_classRoomId_key" ON "ExampleSubjectsOnClassRooms"("classRoomSubjectId", "classRoomId");

-- CreateIndex
CREATE UNIQUE INDEX "ExampleStudents_id_key" ON "ExampleStudents"("id");

-- CreateIndex
CREATE UNIQUE INDEX "ExampleStudents_firstName_fathersName_otherName_classCode_key" ON "ExampleStudents"("firstName", "fathersName", "otherName", "classCode");

-- CreateIndex
CREATE UNIQUE INDEX "ExampleClassSubjectAssessment_id_key" ON "ExampleClassSubjectAssessment"("id");

-- CreateIndex
CREATE UNIQUE INDEX "ExampleStudentSubjectAssessment_id_key" ON "ExampleStudentSubjectAssessment"("id");

-- CreateIndex
CREATE UNIQUE INDEX "ExampleStudentSubjectAssessment_studentId_subjectsOnClassRo_key" ON "ExampleStudentSubjectAssessment"("studentId", "subjectsOnClassRoomsId");

-- CreateIndex
CREATE UNIQUE INDEX "ExampleStudentAssessment_id_key" ON "ExampleStudentAssessment"("id");

-- CreateIndex
CREATE UNIQUE INDEX "ExampleStudentAssessment_studentId_studentSubjectAssessment_key" ON "ExampleStudentAssessment"("studentId", "studentSubjectAssessmentId", "classSubjectAssessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ExampleRemarkOnSubjectAssessment_id_key" ON "ExampleRemarkOnSubjectAssessment"("id");

-- CreateIndex
CREATE UNIQUE INDEX "ExampleRemarkOnAssessment_id_key" ON "ExampleRemarkOnAssessment"("id");

-- CreateIndex
CREATE UNIQUE INDEX "ExampleRemarkOnStudentPerformance_id_key" ON "ExampleRemarkOnStudentPerformance"("id");

-- CreateIndex
CREATE UNIQUE INDEX "ExampleRemarks_id_key" ON "ExampleRemarks"("id");

-- CreateIndex
CREATE UNIQUE INDEX "ExampleStudentPayments_id_key" ON "ExampleStudentPayments"("id");

-- CreateIndex
CREATE UNIQUE INDEX "academic_class_name_school_id_unique" ON "academic_class"("name", "school_id");

-- CreateIndex
CREATE UNIQUE INDEX "academic_session_name_school_id_unique" ON "academic_session"("name", "school_id");

-- CreateIndex
CREATE UNIQUE INDEX "academic_term_name_school_id_academic_session_id_unique" ON "academic_term"("name", "school_id", "academic_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_session_form_school_id_staff_id_session_id_unique" ON "staff_session_form"("school_id", "staff_id", "session_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_school_id_first_name_other_name_surname_unique" ON "student"("school_id", "first_name", "other_name", "surname");

-- CreateIndex
CREATE UNIQUE INDEX "student_session_form_school_id_student_id_unique" ON "student_session_form"("school_id", "student_id");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassroomSubjectAssessment_id_key" ON "ClassroomSubjectAssessment"("id");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAssessmentRecord_id_key" ON "StudentAssessmentRecord"("id");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAssessmentRecord_studentId_studentTermFormId_classSu_key" ON "StudentAssessmentRecord"("studentId", "studentTermFormId", "classSubjectAssessmentId");

-- CreateIndex
CREATE INDEX "AssistantConversation_schoolProfileId_createdByUserId_lastM_idx" ON "AssistantConversation"("schoolProfileId", "createdByUserId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "AssistantMessage_conversationId_createdAt_idx" ON "AssistantMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "AssistantMessage_schoolProfileId_role_createdAt_idx" ON "AssistantMessage"("schoolProfileId", "role", "createdAt");

-- CreateIndex
CREATE INDEX "AssistantRun_conversationId_createdAt_idx" ON "AssistantRun"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "AssistantRun_schoolProfileId_status_createdAt_idx" ON "AssistantRun"("schoolProfileId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AssistantToolExecution_runId_createdAt_idx" ON "AssistantToolExecution"("runId", "createdAt");

-- CreateIndex
CREATE INDEX "AssistantToolExecution_schoolProfileId_toolName_createdAt_idx" ON "AssistantToolExecution"("schoolProfileId", "toolName", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolAssistantConfig_schoolProfileId_key" ON "SchoolAssistantConfig"("schoolProfileId");

-- CreateIndex
CREATE INDEX "AssistantFeedback_schoolProfileId_createdAt_idx" ON "AssistantFeedback"("schoolProfileId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClassRoom_schoolSessionId_name_key" ON "ClassRoom"("schoolSessionId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ClassRoomDepartment_classRoomsId_departmentName_key" ON "ClassRoomDepartment"("classRoomsId", "departmentName");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_title_schoolProfileId_key" ON "Subject"("title", "schoolProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_name_schoolProfileId_sessionTermId_type_key" ON "Wallet"("name", "schoolProfileId", "sessionTermId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "StudentWalletTransactions_walletTransactionId_key" ON "StudentWalletTransactions"("walletTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "BillPayment_transactionId_key" ON "BillPayment"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "BillPayment_invoiceId_key" ON "BillPayment"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "BillSettlement_billId_key" ON "BillSettlement"("billId");

-- CreateIndex
CREATE UNIQUE INDEX "BillSettlement_billPaymentId_key" ON "BillSettlement"("billPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "BillSettlementRepayment_transactionId_key" ON "BillSettlementRepayment"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Guardians_name_phone_schoolProfileId_key" ON "Guardians"("name", "phone", "schoolProfileId");

-- CreateIndex
CREATE INDEX "Notification_schoolProfileId_userId_idx" ON "Notification"("schoolProfileId", "userId");

-- CreateIndex
CREATE INDEX "Notification_schoolProfileId_userId_isRead_idx" ON "Notification"("schoolProfileId", "userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_authorContactId_idx" ON "Notification"("authorContactId");

-- CreateIndex
CREATE INDEX "NotificationPreference_schoolProfileId_userId_idx" ON "NotificationPreference"("schoolProfileId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_schoolProfileId_userId_type_key" ON "NotificationPreference"("schoolProfileId", "userId", "type");

-- CreateIndex
CREATE INDEX "NotificationTag_notificationId_idx" ON "NotificationTag"("notificationId");

-- CreateIndex
CREATE INDEX "NotificationTag_tagName_tagValue_idx" ON "NotificationTag"("tagName", "tagValue");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTag_notificationId_tagName_tagValue_key" ON "NotificationTag"("notificationId", "tagName", "tagValue");

-- CreateIndex
CREATE INDEX "NotificationRecipient_notificationId_idx" ON "NotificationRecipient"("notificationId");

-- CreateIndex
CREATE INDEX "NotificationRecipient_recipientContactId_idx" ON "NotificationRecipient"("recipientContactId");

-- CreateIndex
CREATE INDEX "NotificationRecipient_status_idx" ON "NotificationRecipient"("status");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRecipient_notificationId_recipientContactId_key" ON "NotificationRecipient"("notificationId", "recipientContactId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationContact_userId_key" ON "NotificationContact"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationContact_staffProfileId_key" ON "NotificationContact"("staffProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationContact_studentId_key" ON "NotificationContact"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationContact_guardianId_key" ON "NotificationContact"("guardianId");

-- CreateIndex
CREATE INDEX "NotificationContact_schoolProfileId_idx" ON "NotificationContact"("schoolProfileId");

-- CreateIndex
CREATE INDEX "NotificationContact_role_idx" ON "NotificationContact"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Posts_id_key" ON "Posts"("id");

-- CreateIndex
CREATE UNIQUE INDEX "school_sub_domain_unique" ON "school"("sub_domain");

-- CreateIndex
CREATE UNIQUE INDEX "school_name_sub_domain_unique" ON "school"("name", "sub_domain");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolProfile_subDomain_key" ON "SchoolProfile"("subDomain");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolProfile_name_subDomain_slug_deletedAt_key" ON "SchoolProfile"("name", "subDomain", "slug", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TenantDomain_subdomain_key" ON "TenantDomain"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "TenantDomain_customDomain_key" ON "TenantDomain"("customDomain");

-- CreateIndex
CREATE UNIQUE INDEX "StudentPayment_walletTransactionsId_key" ON "StudentPayment"("walletTransactionsId");

-- CreateIndex
CREATE UNIQUE INDEX "Students_name_surname_otherName_schoolProfileId_deletedAt_key" ON "Students"("name", "surname", "otherName", "schoolProfileId", "deletedAt");

-- CreateIndex
CREATE INDEX "WebsiteTemplateConfig_schoolProfileId_status_idx" ON "WebsiteTemplateConfig"("schoolProfileId", "status");

-- CreateIndex
CREATE INDEX "WebsiteTemplateConfig_schoolProfileId_templateId_idx" ON "WebsiteTemplateConfig"("schoolProfileId", "templateId");

-- CreateIndex
CREATE INDEX "WebsiteMediaAsset_schoolProfileId_kind_idx" ON "WebsiteMediaAsset"("schoolProfileId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "WebsitePublishedConfig_schoolProfileId_key" ON "WebsitePublishedConfig"("schoolProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "WebsitePublishedConfig_websiteConfigId_key" ON "WebsitePublishedConfig"("websiteConfigId");

-- CreateIndex
CREATE INDEX "_ClassRoomDepartmentToFeeHistory_B_index" ON "_ClassRoomDepartmentToFeeHistory"("B");

-- CreateIndex
CREATE INDEX "_BillableHistoryToClassRoomDepartment_B_index" ON "_BillableHistoryToClassRoomDepartment"("B");

-- AddForeignKey
ALTER TABLE "batch_staff_service" ADD CONSTRAINT "batch_staff_service_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "batch_staff_service" ADD CONSTRAINT "batch_staff_service_session_id_academic_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "academic_session"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "batch_staff_service" ADD CONSTRAINT "batch_staff_service_term_id_academic_term_id_fk" FOREIGN KEY ("term_id") REFERENCES "academic_term"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "billable_service" ADD CONSTRAINT "billable_service_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "school_wallet" ADD CONSTRAINT "school_wallet_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_academic_term_id_academic_term_id_fk" FOREIGN KEY ("academic_term_id") REFERENCES "academic_term"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_staff_term_id_staff_term_sheet_id_fk" FOREIGN KEY ("staff_term_id") REFERENCES "staff_term_sheet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_student_term_id_student_term_sheet_id_fk" FOREIGN KEY ("student_term_id") REFERENCES "student_term_sheet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assessment_result" ADD CONSTRAINT "assessment_result_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assessment_result" ADD CONSTRAINT "assessment_result_student_term_sheet_id_student_term_sheet_id_f" FOREIGN KEY ("student_term_sheet_id") REFERENCES "student_term_sheet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_class_subject_id_class_subject_id_fk" FOREIGN KEY ("class_subject_id") REFERENCES "class_subject"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_term_id_academic_term_id_fk" FOREIGN KEY ("term_id") REFERENCES "academic_term"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "class_subject" ADD CONSTRAINT "class_subject_academic_class_id_academic_class_id_fk" FOREIGN KEY ("academic_class_id") REFERENCES "academic_class"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "class_subject" ADD CONSTRAINT "class_subject_academic_session_id_academic_session_id_fk" FOREIGN KEY ("academic_session_id") REFERENCES "academic_session"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "class_subject" ADD CONSTRAINT "class_subject_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "class_subject" ADD CONSTRAINT "class_subject_session_class_id_session_class_id_fk" FOREIGN KEY ("session_class_id") REFERENCES "session_class"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "class_subject" ADD CONSTRAINT "class_subject_subject_id_Subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "Subjects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Subjects" ADD CONSTRAINT "Subjects_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ExampleClassSubjects" ADD CONSTRAINT "ExampleClassSubjects_subjectCode_fkey" FOREIGN KEY ("subjectCode") REFERENCES "ExampleSubject"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExampleSubjectsOnClassRooms" ADD CONSTRAINT "ExampleSubjectsOnClassRooms_classRoomId_fkey" FOREIGN KEY ("classRoomId") REFERENCES "ExampleClassRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExampleSubjectsOnClassRooms" ADD CONSTRAINT "ExampleSubjectsOnClassRooms_classRoomSubjectId_fkey" FOREIGN KEY ("classRoomSubjectId") REFERENCES "ExampleClassSubjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExampleStudents" ADD CONSTRAINT "ExampleStudents_exampleClassId_fkey" FOREIGN KEY ("exampleClassId") REFERENCES "ExampleClassRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExampleStudents" ADD CONSTRAINT "ExampleStudents_performanceRemarkId_fkey" FOREIGN KEY ("performanceRemarkId") REFERENCES "ExampleRemarkOnStudentPerformance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExampleClassSubjectAssessment" ADD CONSTRAINT "ExampleClassSubjectAssessment_subjectsOnClassRoomsId_fkey" FOREIGN KEY ("subjectsOnClassRoomsId") REFERENCES "ExampleSubjectsOnClassRooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExampleStudentSubjectAssessment" ADD CONSTRAINT "ExampleStudentSubjectAssessment_subjectsOnClassRoomsId_fkey" FOREIGN KEY ("subjectsOnClassRoomsId") REFERENCES "ExampleSubjectsOnClassRooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExampleStudentSubjectAssessment" ADD CONSTRAINT "ExampleStudentSubjectAssessment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "ExampleStudents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExampleStudentAssessment" ADD CONSTRAINT "ExampleStudentAssessment_classSubjectsId_fkey" FOREIGN KEY ("classSubjectsId") REFERENCES "ExampleSubjectsOnClassRooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExampleStudentAssessment" ADD CONSTRAINT "ExampleStudentAssessment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "ExampleStudents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExampleStudentAssessment" ADD CONSTRAINT "ExampleStudentAssessment_classSubjectAssessmentId_fkey" FOREIGN KEY ("classSubjectAssessmentId") REFERENCES "ExampleClassSubjectAssessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExampleStudentAssessment" ADD CONSTRAINT "ExampleStudentAssessment_remarkOnAssementId_fkey" FOREIGN KEY ("remarkOnAssementId") REFERENCES "ExampleRemarkOnAssessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExampleStudentAssessment" ADD CONSTRAINT "ExampleStudentAssessment_studentSubjectAssessmentId_fkey" FOREIGN KEY ("studentSubjectAssessmentId") REFERENCES "ExampleStudentSubjectAssessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExampleRemarkOnSubjectAssessment" ADD CONSTRAINT "ExampleRemarkOnSubjectAssessment_remarksId_fkey" FOREIGN KEY ("remarksId") REFERENCES "ExampleRemarks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExampleRemarkOnAssessment" ADD CONSTRAINT "ExampleRemarkOnAssessment_remarksId_fkey" FOREIGN KEY ("remarksId") REFERENCES "ExampleRemarks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExampleRemarkOnStudentPerformance" ADD CONSTRAINT "ExampleRemarkOnStudentPerformance_remarksId_fkey" FOREIGN KEY ("remarksId") REFERENCES "ExampleRemarks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExampleStudentPayments" ADD CONSTRAINT "ExampleStudentPayments_exampleStudentsId_fkey" FOREIGN KEY ("exampleStudentsId") REFERENCES "ExampleStudents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_sales" ADD CONSTRAINT "inventory_sales_book_id_inventory_id_fk" FOREIGN KEY ("book_id") REFERENCES "inventory"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_sales" ADD CONSTRAINT "inventory_sales_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_sales" ADD CONSTRAINT "inventory_sales_transaction_id_transaction_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "transaction"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "academic_class" ADD CONSTRAINT "academic_class_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "academic_session" ADD CONSTRAINT "academic_session_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "academic_term" ADD CONSTRAINT "academic_term_academic_session_id_academic_session_id_fk" FOREIGN KEY ("academic_session_id") REFERENCES "academic_session"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "academic_term" ADD CONSTRAINT "academic_term_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "staff_class_role" ADD CONSTRAINT "staff_class_role_session_class_id_session_class_id_fk" FOREIGN KEY ("session_class_id") REFERENCES "session_class"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "staff_service" ADD CONSTRAINT "staff_service_batch_service_id_batch_staff_service_id_fk" FOREIGN KEY ("batch_service_id") REFERENCES "batch_staff_service"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "staff_service" ADD CONSTRAINT "staff_service_staff_tx_id_transaction_id_fk" FOREIGN KEY ("staff_tx_id") REFERENCES "transaction"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "staff_service_cost" ADD CONSTRAINT "staff_service_cost_service_id_billable_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "billable_service"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "staff_service_cost" ADD CONSTRAINT "staff_service_cost_staff_service_id_staff_service_id_fk" FOREIGN KEY ("staff_service_id") REFERENCES "staff_service"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "staff_session_form" ADD CONSTRAINT "staff_session_form_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "staff_session_form" ADD CONSTRAINT "staff_session_form_session_id_academic_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "academic_session"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "staff_subject_role" ADD CONSTRAINT "staff_subject_role_staff_class_role_id_staff_class_role_id_fk" FOREIGN KEY ("staff_class_role_id") REFERENCES "staff_class_role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "staff_term_sheet" ADD CONSTRAINT "staff_term_sheet_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student" ADD CONSTRAINT "student_guardianId_guardian_id_fk" FOREIGN KEY ("guardianId") REFERENCES "guardian"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student" ADD CONSTRAINT "student_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_attendance" ADD CONSTRAINT "student_attendance_attendance_id_student_day_attendance_id_fk" FOREIGN KEY ("attendance_id") REFERENCES "student_day_attendance"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_attendance" ADD CONSTRAINT "student_attendance_student_term_sheet_id_student_term_sheet_id_" FOREIGN KEY ("student_term_sheet_id") REFERENCES "student_term_sheet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_day_attendance" ADD CONSTRAINT "student_day_attendance_class_subject_id_class_subject_id_fk" FOREIGN KEY ("class_subject_id") REFERENCES "class_subject"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_day_attendance" ADD CONSTRAINT "student_day_attendance_session_class_id_session_class_id_fk" FOREIGN KEY ("session_class_id") REFERENCES "session_class"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_day_attendance" ADD CONSTRAINT "student_day_attendance_term_id_academic_term_id_fk" FOREIGN KEY ("term_id") REFERENCES "academic_term"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_session_form" ADD CONSTRAINT "student_session_form_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_session_form" ADD CONSTRAINT "student_session_form_session_id_academic_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "academic_session"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_session_form" ADD CONSTRAINT "student_session_form_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_term_sheet" ADD CONSTRAINT "student_term_sheet_academic_term_id_academic_term_id_fk" FOREIGN KEY ("academic_term_id") REFERENCES "academic_term"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_term_sheet" ADD CONSTRAINT "student_term_sheet_session_class_id_session_class_id_fk" FOREIGN KEY ("session_class_id") REFERENCES "session_class"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_term_sheet" ADD CONSTRAINT "student_term_sheet_session_sheet_id_student_session_form_id_fk" FOREIGN KEY ("session_sheet_id") REFERENCES "student_session_form"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_term_sheet" ADD CONSTRAINT "student_term_sheet_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_saasAccountId_fkey" FOREIGN KEY ("saasAccountId") REFERENCES "SaasAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomSubjectAssessment" ADD CONSTRAINT "ClassroomSubjectAssessment_departmentSubjectId_fkey" FOREIGN KEY ("departmentSubjectId") REFERENCES "DepartmentSubject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAssessmentRecord" ADD CONSTRAINT "StudentAssessmentRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAssessmentRecord" ADD CONSTRAINT "StudentAssessmentRecord_classSubjectAssessmentId_fkey" FOREIGN KEY ("classSubjectAssessmentId") REFERENCES "ClassroomSubjectAssessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAssessmentRecord" ADD CONSTRAINT "StudentAssessmentRecord_studentTermFormId_fkey" FOREIGN KEY ("studentTermFormId") REFERENCES "StudentTermForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportPrintLog" ADD CONSTRAINT "ReportPrintLog_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportPrintLog" ADD CONSTRAINT "ReportPrintLog_termId_fkey" FOREIGN KEY ("termId") REFERENCES "SessionTerm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantConversation" ADD CONSTRAINT "AssistantConversation_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantConversation" ADD CONSTRAINT "AssistantConversation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantMessage" ADD CONSTRAINT "AssistantMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AssistantConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantMessage" ADD CONSTRAINT "AssistantMessage_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantMessage" ADD CONSTRAINT "AssistantMessage_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantRun" ADD CONSTRAINT "AssistantRun_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AssistantConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantRun" ADD CONSTRAINT "AssistantRun_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantRun" ADD CONSTRAINT "AssistantRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantToolExecution" ADD CONSTRAINT "AssistantToolExecution_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AssistantRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantToolExecution" ADD CONSTRAINT "AssistantToolExecution_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AssistantConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantToolExecution" ADD CONSTRAINT "AssistantToolExecution_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolAssistantConfig" ADD CONSTRAINT "SchoolAssistantConfig_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantFeedback" ADD CONSTRAINT "AssistantFeedback_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantFeedback" ADD CONSTRAINT "AssistantFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantFeedback" ADD CONSTRAINT "AssistantFeedback_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AssistantConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantFeedback" ADD CONSTRAINT "AssistantFeedback_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AssistantRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassRoom" ADD CONSTRAINT "ClassRoom_schoolSessionId_fkey" FOREIGN KEY ("schoolSessionId") REFERENCES "SchoolSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassRoom" ADD CONSTRAINT "ClassRoom_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassRoomDepartment" ADD CONSTRAINT "ClassRoomDepartment_classRoomsId_fkey" FOREIGN KEY ("classRoomsId") REFERENCES "ClassRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassRoomDepartment" ADD CONSTRAINT "ClassRoomDepartment_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentSubject" ADD CONSTRAINT "DepartmentSubject_classRoomDepartmentId_fkey" FOREIGN KEY ("classRoomDepartmentId") REFERENCES "ClassRoomDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentSubject" ADD CONSTRAINT "DepartmentSubject_sessionTermId_fkey" FOREIGN KEY ("sessionTermId") REFERENCES "SessionTerm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentSubject" ADD CONSTRAINT "DepartmentSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_sessionTermId_fkey" FOREIGN KEY ("sessionTermId") REFERENCES "SessionTerm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentWalletTransactions" ADD CONSTRAINT "StudentWalletTransactions_walletTransactionId_fkey" FOREIGN KEY ("walletTransactionId") REFERENCES "WalletTransactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentWalletTransactions" ADD CONSTRAINT "StudentWalletTransactions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransactions" ADD CONSTRAINT "WalletTransactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransactions" ADD CONSTRAINT "WalletTransactions_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "Funds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Funds" ADD CONSTRAINT "Funds_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Billable" ADD CONSTRAINT "Billable_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillableHistory" ADD CONSTRAINT "BillableHistory_feeId_fkey" FOREIGN KEY ("feeId") REFERENCES "Billable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillableHistory" ADD CONSTRAINT "BillableHistory_schoolSessionId_fkey" FOREIGN KEY ("schoolSessionId") REFERENCES "SchoolSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillableHistory" ADD CONSTRAINT "BillableHistory_termId_fkey" FOREIGN KEY ("termId") REFERENCES "SessionTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillableHistory" ADD CONSTRAINT "BillableHistory_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bills" ADD CONSTRAINT "Bills_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "BillInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bills" ADD CONSTRAINT "Bills_staffTermProfileId_fkey" FOREIGN KEY ("staffTermProfileId") REFERENCES "StaffTermProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bills" ADD CONSTRAINT "Bills_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bills" ADD CONSTRAINT "Bills_billPaymentId_fkey" FOREIGN KEY ("billPaymentId") REFERENCES "BillPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bills" ADD CONSTRAINT "Bills_billableId_fkey" FOREIGN KEY ("billableId") REFERENCES "Billable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bills" ADD CONSTRAINT "Bills_billableHistoryId_fkey" FOREIGN KEY ("billableHistoryId") REFERENCES "BillableHistory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bills" ADD CONSTRAINT "Bills_sessionTermId_fkey" FOREIGN KEY ("sessionTermId") REFERENCES "SessionTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bills" ADD CONSTRAINT "Bills_schoolSessionId_fkey" FOREIGN KEY ("schoolSessionId") REFERENCES "SchoolSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bills" ADD CONSTRAINT "Bills_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillPayment" ADD CONSTRAINT "BillPayment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "WalletTransactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillPayment" ADD CONSTRAINT "BillPayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "BillInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillSettlement" ADD CONSTRAINT "BillSettlement_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillSettlement" ADD CONSTRAINT "BillSettlement_billPaymentId_fkey" FOREIGN KEY ("billPaymentId") REFERENCES "BillPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillSettlementRepayment" ADD CONSTRAINT "BillSettlementRepayment_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "BillSettlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillSettlementRepayment" ADD CONSTRAINT "BillSettlementRepayment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "WalletTransactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guardians" ADD CONSTRAINT "Guardians_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryIssuance" ADD CONSTRAINT "InventoryIssuance_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryIssuance" ADD CONSTRAINT "InventoryIssuance_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_authorContactId_fkey" FOREIGN KEY ("authorContactId") REFERENCES "NotificationContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationTag" ADD CONSTRAINT "NotificationTag_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_recipientContactId_fkey" FOREIGN KEY ("recipientContactId") REFERENCES "NotificationContact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationContact" ADD CONSTRAINT "NotificationContact_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationContact" ADD CONSTRAINT "NotificationContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationContact" ADD CONSTRAINT "NotificationContact_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "StaffProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationContact" ADD CONSTRAINT "NotificationContact_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationContact" ADD CONSTRAINT "NotificationContact_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian" ADD CONSTRAINT "guardian_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "session_class" ADD CONSTRAINT "session_class_academic_class_id_academic_class_id_fk" FOREIGN KEY ("academic_class_id") REFERENCES "academic_class"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "session_class" ADD CONSTRAINT "session_class_academic_session_id_academic_session_id_fk" FOREIGN KEY ("academic_session_id") REFERENCES "academic_session"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "session_class" ADD CONSTRAINT "session_class_school_id_school_id_fk" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SchoolProfile" ADD CONSTRAINT "SchoolProfile_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "SaasAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantDomain" ADD CONSTRAINT "TenantDomain_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantDomain" ADD CONSTRAINT "TenantDomain_saasAccountId_fkey" FOREIGN KEY ("saasAccountId") REFERENCES "SaasAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolSession" ADD CONSTRAINT "SchoolSession_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "SchoolProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionTerm" ADD CONSTRAINT "SessionTerm_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "SchoolProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionTerm" ADD CONSTRAINT "SessionTerm_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SchoolSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffTermProfile" ADD CONSTRAINT "StaffTermProfile_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "StaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffTermProfile" ADD CONSTRAINT "StaffTermProfile_schoolSessionId_fkey" FOREIGN KEY ("schoolSessionId") REFERENCES "SchoolSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffTermProfile" ADD CONSTRAINT "StaffTermProfile_sessionTermId_fkey" FOREIGN KEY ("sessionTermId") REFERENCES "SessionTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffClassroomDepartmentTermProfiles" ADD CONSTRAINT "StaffClassroomDepartmentTermProfiles_classRoomDepartmentId_fkey" FOREIGN KEY ("classRoomDepartmentId") REFERENCES "ClassRoomDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffClassroomDepartmentTermProfiles" ADD CONSTRAINT "StaffClassroomDepartmentTermProfiles_staffTermProfileId_fkey" FOREIGN KEY ("staffTermProfileId") REFERENCES "StaffTermProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffSubject" ADD CONSTRAINT "StaffSubject_staffProfilesId_fkey" FOREIGN KEY ("staffProfilesId") REFERENCES "StaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffSubject" ADD CONSTRAINT "StaffSubject_departmentSubjectId_fkey" FOREIGN KEY ("departmentSubjectId") REFERENCES "DepartmentSubject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassRoomAttendance" ADD CONSTRAINT "ClassRoomAttendance_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassRoomAttendance" ADD CONSTRAINT "ClassRoomAttendance_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "ClassRoomDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassRoomAttendance" ADD CONSTRAINT "ClassRoomAttendance_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "StaffProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAttendance" ADD CONSTRAINT "StudentAttendance_studentTermFormId_fkey" FOREIGN KEY ("studentTermFormId") REFERENCES "StudentTermForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAttendance" ADD CONSTRAINT "StudentAttendance_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAttendance" ADD CONSTRAINT "StudentAttendance_classroomAttendanceId_fkey" FOREIGN KEY ("classroomAttendanceId") REFERENCES "ClassRoomAttendance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAttendance" ADD CONSTRAINT "StudentAttendance_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "ClassRoomDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fees" ADD CONSTRAINT "Fees_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeHistory" ADD CONSTRAINT "FeeHistory_feeId_fkey" FOREIGN KEY ("feeId") REFERENCES "Fees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeHistory" ADD CONSTRAINT "FeeHistory_schoolSessionId_fkey" FOREIGN KEY ("schoolSessionId") REFERENCES "SchoolSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeHistory" ADD CONSTRAINT "FeeHistory_termId_fkey" FOREIGN KEY ("termId") REFERENCES "SessionTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeHistory" ADD CONSTRAINT "FeeHistory_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFee" ADD CONSTRAINT "StudentFee_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFee" ADD CONSTRAINT "StudentFee_studentTermFormId_fkey" FOREIGN KEY ("studentTermFormId") REFERENCES "StudentTermForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFee" ADD CONSTRAINT "StudentFee_schoolSessionId_fkey" FOREIGN KEY ("schoolSessionId") REFERENCES "SchoolSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFee" ADD CONSTRAINT "StudentFee_feeHistoryId_fkey" FOREIGN KEY ("feeHistoryId") REFERENCES "FeeHistory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFee" ADD CONSTRAINT "StudentFee_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeDiscount" ADD CONSTRAINT "FeeDiscount_studentFeeId_fkey" FOREIGN KEY ("studentFeeId") REFERENCES "StudentFee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPayment" ADD CONSTRAINT "StudentPayment_studentBillPaymentsId_fkey" FOREIGN KEY ("studentBillPaymentsId") REFERENCES "StudentFee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPayment" ADD CONSTRAINT "StudentPayment_studentTermFormId_fkey" FOREIGN KEY ("studentTermFormId") REFERENCES "StudentTermForm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPayment" ADD CONSTRAINT "StudentPayment_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPayment" ADD CONSTRAINT "StudentPayment_walletTransactionsId_fkey" FOREIGN KEY ("walletTransactionsId") REFERENCES "WalletTransactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPayment" ADD CONSTRAINT "StudentPayment_studentPurchaseId_fkey" FOREIGN KEY ("studentPurchaseId") REFERENCES "StudentPurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Students" ADD CONSTRAINT "Students_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGuardians" ADD CONSTRAINT "StudentGuardians_guardiansId_fkey" FOREIGN KEY ("guardiansId") REFERENCES "Guardians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGuardians" ADD CONSTRAINT "StudentGuardians_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSessionForm" ADD CONSTRAINT "StudentSessionForm_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSessionForm" ADD CONSTRAINT "StudentSessionForm_schoolSessionId_fkey" FOREIGN KEY ("schoolSessionId") REFERENCES "SchoolSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSessionForm" ADD CONSTRAINT "StudentSessionForm_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSessionForm" ADD CONSTRAINT "StudentSessionForm_classroomDepartmentId_fkey" FOREIGN KEY ("classroomDepartmentId") REFERENCES "ClassRoomDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTermForm" ADD CONSTRAINT "StudentTermForm_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTermForm" ADD CONSTRAINT "StudentTermForm_sessionTermId_fkey" FOREIGN KEY ("sessionTermId") REFERENCES "SessionTerm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTermForm" ADD CONSTRAINT "StudentTermForm_schoolSessionId_fkey" FOREIGN KEY ("schoolSessionId") REFERENCES "SchoolSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTermForm" ADD CONSTRAINT "StudentTermForm_studentSessionFormId_fkey" FOREIGN KEY ("studentSessionFormId") REFERENCES "StudentSessionForm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTermForm" ADD CONSTRAINT "StudentTermForm_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTermForm" ADD CONSTRAINT "StudentTermForm_classroomDepartmentId_fkey" FOREIGN KEY ("classroomDepartmentId") REFERENCES "ClassRoomDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteTemplateConfig" ADD CONSTRAINT "WebsiteTemplateConfig_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteMediaAsset" ADD CONSTRAINT "WebsiteMediaAsset_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsitePublishedConfig" ADD CONSTRAINT "WebsitePublishedConfig_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsitePublishedConfig" ADD CONSTRAINT "WebsitePublishedConfig_websiteConfigId_fkey" FOREIGN KEY ("websiteConfigId") REFERENCES "WebsiteTemplateConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClassRoomDepartmentToFeeHistory" ADD CONSTRAINT "_ClassRoomDepartmentToFeeHistory_A_fkey" FOREIGN KEY ("A") REFERENCES "ClassRoomDepartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClassRoomDepartmentToFeeHistory" ADD CONSTRAINT "_ClassRoomDepartmentToFeeHistory_B_fkey" FOREIGN KEY ("B") REFERENCES "FeeHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BillableHistoryToClassRoomDepartment" ADD CONSTRAINT "_BillableHistoryToClassRoomDepartment_A_fkey" FOREIGN KEY ("A") REFERENCES "BillableHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BillableHistoryToClassRoomDepartment" ADD CONSTRAINT "_BillableHistoryToClassRoomDepartment_B_fkey" FOREIGN KEY ("B") REFERENCES "ClassRoomDepartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
