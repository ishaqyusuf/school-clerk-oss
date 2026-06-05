function buildContactWhere(input) {
    switch (input.role) {
        case "guardian":
            return { guardianId: input.guardianId };
        case "staff":
            return { staffProfileId: input.staffProfileId };
        case "student":
            return { studentId: input.studentId };
        case "user":
            return { userId: input.userId };
    }
}
function buildContactCreateData(input) {
    const common = {
        displayName: input.displayName ?? null,
        role: input.role,
        schoolProfileId: input.schoolProfileId,
    };
    switch (input.role) {
        case "guardian":
            return { ...common, guardianId: input.guardianId };
        case "staff":
            return { ...common, staffProfileId: input.staffProfileId };
        case "student":
            return { ...common, studentId: input.studentId };
        case "user":
            return { ...common, userId: input.userId };
    }
}
export async function ensureNotificationContact(db, input) {
    const existing = await db.notificationContact.findFirst({
        where: {
            deletedAt: null,
            schoolProfileId: input.schoolProfileId,
            ...buildContactWhere(input),
        },
    });
    if (existing) {
        if (input.displayName && existing.displayName !== input.displayName) {
            return db.notificationContact.update({
                where: { id: existing.id },
                data: {
                    displayName: input.displayName,
                },
            });
        }
        return existing;
    }
    return db.notificationContact.create({
        data: buildContactCreateData(input),
    });
}
