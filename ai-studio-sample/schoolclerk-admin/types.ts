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
