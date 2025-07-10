export interface HelperTrackingRecord {
  HelperMobileNo: string;
  HelperName?: string;
  BookingID?: string;
  BlockedDateTime?: string;         // ISO timestamp
  ReleaseDateTime?: string;         // ISO timestamp
  BreakTime?: string;               // ISO timestamp
  Duration?: number;
  BlockReason?: string;
  WorkStatus?: string;
  BlockStatus?: string;
  BlockedDate?: string;             // "DD-MM-YYYY"
  ReleaseDate?: string;             // "DD-MM-YYYY"
  BlockedTime?: string;             // "HH:mm"
  ReleaseTime?: string;             // "HH:mm"
  BreakTimeFormatted?: string;      // "HH:mm"
}

export interface SuggestedHelper {
  HelperMobileNo: string;
  HelperName?: string;
  HelperLanguageSpeak?: string;
  HelperImage?: string;
  KycVerified?: boolean;
  travelCharges?: number;
  HelperRating?: number;
  totalOrderCount?: number;
  userOrderCount?: number;
  totalFavCount?: number;
  userFavCount?: number;
  BreakHours?: string;
  IdleHours?: string;
  ForceIdleHours?: string;
  UserTerms?: string;
  helperTrackingDetails?: HelperTrackingRecord[];
  availableTimings?: TimeCheckResult | { error?: string; returnValue?: string };
}

export interface TimeCheckResult {
  returnValue?: string;
  suggested_t1?: string;
  suggested_t2?: string;
  error?: string;
}

export interface CurrentlySelected {
  hours: string;
  minutes: string;
  period: 'AM' | 'PM';
  jobDate: string; // Format: 'DD-MM-YYYY'
}

export interface FrameHelperAvailabilityParams {
  currentlySelected: CurrentlySelected;
  suggestedHelpers: SuggestedHelper[];
  helperTrackingDetails: HelperTrackingRecord[];
  totalJobDuration: number;
}