// MeetingProvider interface for all meeting providers
// export interface MeetingProvider {
//   createMeeting(meetingData: any): Promise<any>;
//   updateMeeting(meetingId: string, meetingData: any): Promise<any>;
//   deleteMeeting(meetingId: string): Promise<void>;
//   getMeeting(meetingId: string): Promise<any>;
// }

// Provider types
// type ProviderType = 'zoom' | 'google';

import googleMeetProvider from './googleMeetProvider.js';
import zoomProvider from './zoomProvider.js';

export function getMeetingProvider(provider) {
  switch (provider) {
    case 'zoom':
      return zoomProvider;
    case 'google':
      return googleMeetProvider;
    default:
      throw new Error('Unsupported meeting provider');
  }
}
