export interface Term {
    id: string;
    name: string;
    description?: string;
    status: 'completed' | 'active' | 'upcoming';
    startDate: string;
    endDate: string;
    midTermDate?: string;
    completionPercentage?: number; // 0-100
}

export interface Session {
    id: string;
    name: string;
    status: 'current' | 'archived' | 'planning';
    activeTerm: string;
    duration: string;
    terms: Term[];
}

export interface Stats {
    currentStatus: string;
    termsRecorded: number;
    daysRemaining: number;
    progress: number;
}

export interface Student {
    id: string;
    name: string;
    gender: 'Male' | 'Female';
    admissionNo: string;
    grade: string;
    status: 'Active' | 'Inactive';
    paymentStatus: 'Paid' | 'Partial' | 'Unpaid';
    image: string;
}

export interface Staff {
    id: string;
    name: string;
    email: string;
    role: 'Teacher' | 'Admin' | 'Accountant' | 'Principal';
    status: 'Active' | 'Inactive';
    permissions: Permission[];
    image?: string;
}

export interface Permission {
    id: string;
    type: 'classroom' | 'subject';
    targetId: string; // ID of the classroom or subject
    targetName: string; // Name of the classroom or subject
}
