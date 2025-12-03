// MeetingProvider interface for all meeting providers
export interface MeetingProvider {
  createMeeting(meetingData: any): Promise<any>;
  updateMeeting(meetingId: string, meetingData: any): Promise<any>;
  deleteMeeting(meetingId: string): Promise<void>;
  getMeeting(meetingId: string): Promise<any>;
}

// Provider types
type ProviderType = 'zoom' | 'google';

import GoogleMeetProvider from './googleMeetProvider';
// Factory to get provider instance
import zoomProvider from './zoomProvider';

export function getMeetingProvider(provider: ProviderType): MeetingProvider {
  switch (provider) {
    case 'zoom':
      return zoomProvider;
    case 'google':
      return GoogleMeetProvider;
    default:
      throw new Error('Unsupported meeting provider');
  }
}
