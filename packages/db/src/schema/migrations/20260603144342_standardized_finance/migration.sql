-- CreateEnum
CREATE TYPE "FinanceAccountType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "FinanceItemType" AS ENUM ('TUITION_FEE', 'BOOK', 'SERVICE', 'SALARY', 'OTHER');

-- CreateEnum
CREATE TYPE "FinancePayerType" AS ENUM ('STUDENT', 'STAFF', 'SCHOOL');

-- CreateEnum
CREATE TYPE "FinanceChargeStatus" AS ENUM ('DRAFT', 'PENDING', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'WAIVED');

-- CreateEnum
CREATE TYPE "FinancePaymentStatus" AS ENUM ('PAID', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "FinanceCollectionStatus" AS ENUM ('NOT_REQUIRED', 'NOT_COLLECTED', 'COLLECTED');

-- CreateEnum
CREATE TYPE "FinanceTransferStatus" AS ENUM ('COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FinanceLedgerDirection" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "FinanceLedgerSourceType" AS ENUM ('CHARGE', 'PAYMENT', 'TRANSFER', 'TRANSFER_REVERSAL', 'CANCELLATION', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "FinanceStream" (
    "id" TEXT NOT NULL,
    "schoolProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "accountType" "FinanceAccountType" NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "FinanceStream_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceItem" (
    "id" TEXT NOT NULL,
    "schoolProfileId" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "type" "FinanceItemType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "collectable" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "schoolSessionId" TEXT,
    "sessionTermId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "FinanceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceItemClassRoomDepartment" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "classRoomDepartmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "FinanceItemClassRoomDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceCharge" (
    "id" TEXT NOT NULL,
    "schoolProfileId" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "itemId" TEXT,
    "payerType" "FinancePayerType" NOT NULL,
    "studentId" TEXT,
    "studentTermFormId" TEXT,
    "staffProfileId" TEXT,
    "staffTermProfileId" TEXT,
    "classroomDepartmentId" TEXT,
    "schoolSessionId" TEXT,
    "sessionTermId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "FinanceChargeStatus" NOT NULL DEFAULT 'PENDING',
    "collectionStatus" "FinanceCollectionStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "dueDate" TIMESTAMP(0),
    "cancelledAt" TIMESTAMP(0),
    "cancelledById" TEXT,
    "cancellationReason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "FinanceCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancePayment" (
    "id" TEXT NOT NULL,
    "schoolProfileId" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "payerType" "FinancePayerType" NOT NULL,
    "studentId" TEXT,
    "staffProfileId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "FinancePaymentStatus" NOT NULL DEFAULT 'PAID',
    "paymentDate" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT,
    "reference" TEXT,
    "note" TEXT,
    "receivedById" TEXT,
    "cancelledAt" TIMESTAMP(0),
    "cancelledById" TEXT,
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "FinancePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancePaymentAllocation" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "chargeId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "FinancePaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceTransfer" (
    "id" TEXT NOT NULL,
    "schoolProfileId" TEXT NOT NULL,
    "fromStreamId" TEXT NOT NULL,
    "toStreamId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "FinanceTransferStatus" NOT NULL DEFAULT 'COMPLETED',
    "note" TEXT,
    "sentById" TEXT,
    "cancelledAt" TIMESTAMP(0),
    "cancelledById" TEXT,
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "FinanceTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceLedgerEntry" (
    "id" TEXT NOT NULL,
    "schoolProfileId" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "direction" "FinanceLedgerDirection" NOT NULL,
    "sourceType" "FinanceLedgerSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "occurredAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdById" TEXT,
    "chargeId" TEXT,
    "paymentId" TEXT,
    "transferId" TEXT,
    "createdAt" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(0),

    CONSTRAINT "FinanceLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinanceStream_schoolProfileId_accountType_idx" ON "FinanceStream"("schoolProfileId", "accountType");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceStream_schoolProfileId_slug_deletedAt_key" ON "FinanceStream"("schoolProfileId", "slug", "deletedAt");

-- CreateIndex
CREATE INDEX "FinanceItem_schoolProfileId_streamId_idx" ON "FinanceItem"("schoolProfileId", "streamId");

-- CreateIndex
CREATE INDEX "FinanceItem_schoolSessionId_sessionTermId_idx" ON "FinanceItem"("schoolSessionId", "sessionTermId");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceItem_schoolProfileId_type_name_schoolSessionId_sessi_key" ON "FinanceItem"("schoolProfileId", "type", "name", "schoolSessionId", "sessionTermId", "deletedAt");

-- CreateIndex
CREATE INDEX "FinanceItemClassRoomDepartment_classRoomDepartmentId_idx" ON "FinanceItemClassRoomDepartment"("classRoomDepartmentId");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceItemClassRoomDepartment_itemId_classRoomDepartmentId_key" ON "FinanceItemClassRoomDepartment"("itemId", "classRoomDepartmentId", "deletedAt");

-- CreateIndex
CREATE INDEX "FinanceCharge_schoolProfileId_streamId_status_idx" ON "FinanceCharge"("schoolProfileId", "streamId", "status");

-- CreateIndex
CREATE INDEX "FinanceCharge_studentId_sessionTermId_idx" ON "FinanceCharge"("studentId", "sessionTermId");

-- CreateIndex
CREATE INDEX "FinanceCharge_staffProfileId_sessionTermId_idx" ON "FinanceCharge"("staffProfileId", "sessionTermId");

-- CreateIndex
CREATE INDEX "FinanceCharge_schoolSessionId_sessionTermId_idx" ON "FinanceCharge"("schoolSessionId", "sessionTermId");

-- CreateIndex
CREATE INDEX "FinancePayment_schoolProfileId_streamId_status_idx" ON "FinancePayment"("schoolProfileId", "streamId", "status");

-- CreateIndex
CREATE INDEX "FinancePayment_studentId_paymentDate_idx" ON "FinancePayment"("studentId", "paymentDate");

-- CreateIndex
CREATE INDEX "FinancePayment_staffProfileId_paymentDate_idx" ON "FinancePayment"("staffProfileId", "paymentDate");

-- CreateIndex
CREATE INDEX "FinancePaymentAllocation_chargeId_idx" ON "FinancePaymentAllocation"("chargeId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancePaymentAllocation_paymentId_chargeId_deletedAt_key" ON "FinancePaymentAllocation"("paymentId", "chargeId", "deletedAt");

-- CreateIndex
CREATE INDEX "FinanceTransfer_schoolProfileId_status_idx" ON "FinanceTransfer"("schoolProfileId", "status");

-- CreateIndex
CREATE INDEX "FinanceTransfer_fromStreamId_toStreamId_idx" ON "FinanceTransfer"("fromStreamId", "toStreamId");

-- CreateIndex
CREATE INDEX "FinanceLedgerEntry_schoolProfileId_streamId_occurredAt_idx" ON "FinanceLedgerEntry"("schoolProfileId", "streamId", "occurredAt");

-- CreateIndex
CREATE INDEX "FinanceLedgerEntry_sourceType_sourceId_idx" ON "FinanceLedgerEntry"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "FinanceLedgerEntry_chargeId_idx" ON "FinanceLedgerEntry"("chargeId");

-- CreateIndex
CREATE INDEX "FinanceLedgerEntry_paymentId_idx" ON "FinanceLedgerEntry"("paymentId");

-- CreateIndex
CREATE INDEX "FinanceLedgerEntry_transferId_idx" ON "FinanceLedgerEntry"("transferId");

-- AddForeignKey
ALTER TABLE "FinanceStream" ADD CONSTRAINT "FinanceStream_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceItem" ADD CONSTRAINT "FinanceItem_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceItem" ADD CONSTRAINT "FinanceItem_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "FinanceStream"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceItem" ADD CONSTRAINT "FinanceItem_schoolSessionId_fkey" FOREIGN KEY ("schoolSessionId") REFERENCES "SchoolSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceItem" ADD CONSTRAINT "FinanceItem_sessionTermId_fkey" FOREIGN KEY ("sessionTermId") REFERENCES "SessionTerm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceItemClassRoomDepartment" ADD CONSTRAINT "FinanceItemClassRoomDepartment_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "FinanceItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceItemClassRoomDepartment" ADD CONSTRAINT "FinanceItemClassRoomDepartment_classRoomDepartmentId_fkey" FOREIGN KEY ("classRoomDepartmentId") REFERENCES "ClassRoomDepartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceCharge" ADD CONSTRAINT "FinanceCharge_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceCharge" ADD CONSTRAINT "FinanceCharge_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "FinanceStream"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceCharge" ADD CONSTRAINT "FinanceCharge_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "FinanceItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceCharge" ADD CONSTRAINT "FinanceCharge_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceCharge" ADD CONSTRAINT "FinanceCharge_studentTermFormId_fkey" FOREIGN KEY ("studentTermFormId") REFERENCES "StudentTermForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceCharge" ADD CONSTRAINT "FinanceCharge_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "StaffProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceCharge" ADD CONSTRAINT "FinanceCharge_staffTermProfileId_fkey" FOREIGN KEY ("staffTermProfileId") REFERENCES "StaffTermProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceCharge" ADD CONSTRAINT "FinanceCharge_classroomDepartmentId_fkey" FOREIGN KEY ("classroomDepartmentId") REFERENCES "ClassRoomDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceCharge" ADD CONSTRAINT "FinanceCharge_schoolSessionId_fkey" FOREIGN KEY ("schoolSessionId") REFERENCES "SchoolSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceCharge" ADD CONSTRAINT "FinanceCharge_sessionTermId_fkey" FOREIGN KEY ("sessionTermId") REFERENCES "SessionTerm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancePayment" ADD CONSTRAINT "FinancePayment_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancePayment" ADD CONSTRAINT "FinancePayment_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "FinanceStream"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancePayment" ADD CONSTRAINT "FinancePayment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancePayment" ADD CONSTRAINT "FinancePayment_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "StaffProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancePaymentAllocation" ADD CONSTRAINT "FinancePaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "FinancePayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancePaymentAllocation" ADD CONSTRAINT "FinancePaymentAllocation_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "FinanceCharge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransfer" ADD CONSTRAINT "FinanceTransfer_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransfer" ADD CONSTRAINT "FinanceTransfer_fromStreamId_fkey" FOREIGN KEY ("fromStreamId") REFERENCES "FinanceStream"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransfer" ADD CONSTRAINT "FinanceTransfer_toStreamId_fkey" FOREIGN KEY ("toStreamId") REFERENCES "FinanceStream"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceLedgerEntry" ADD CONSTRAINT "FinanceLedgerEntry_schoolProfileId_fkey" FOREIGN KEY ("schoolProfileId") REFERENCES "SchoolProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceLedgerEntry" ADD CONSTRAINT "FinanceLedgerEntry_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "FinanceStream"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceLedgerEntry" ADD CONSTRAINT "FinanceLedgerEntry_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "FinanceCharge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceLedgerEntry" ADD CONSTRAINT "FinanceLedgerEntry_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "FinancePayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceLedgerEntry" ADD CONSTRAINT "FinanceLedgerEntry_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "FinanceTransfer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
