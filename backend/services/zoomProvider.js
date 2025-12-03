import axios from 'axios';

class ZoomProviderImpl {
  constructor() {
    this.accountId = process.env.ZOOM_ACCOUNT_ID;
    this.clientId = process.env.ZOOM_CLIENT_ID;
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET;
    this.accessToken = null;
    this.tokenExpiration = 0;
    this.client = axios.create({
      baseURL: 'https://api.zoom.us/v2',
      timeout: 10000,
    });
    this.client.interceptors.request.use(async (config) => {
      if (!this.accessToken || Date.now() >= this.tokenExpiration) {
        await this.getAccessToken();
      }
      config.headers.Authorization = `Bearer ${this.accessToken}`;
      return config;
    });
  }

  async getAccessToken() {
    const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${this.accountId}`;
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await axios.post(tokenUrl, {}, {
      headers: { Authorization: `Basic ${auth}` },
    });
    this.accessToken = response.data.access_token;
    this.tokenExpiration = Date.now() + response.data.expires_in * 1000 - 60000;
  }

  async createMeeting(meetingData) {
    const response = await this.client.post('/users/me/meetings', meetingData);
    return response.data;
  }

  async updateMeeting(meetingId, meetingData) {
    const response = await this.client.patch(`/meetings/${meetingId}`, meetingData);
    return response.data;
  }

  async deleteMeeting(meetingId) {
    await this.client.delete(`/meetings/${meetingId}`);
  }

  async getMeeting(meetingId) {
    const response = await this.client.get(`/meetings/${meetingId}`);
    return response.data;
  }
}

const ZoomProvider = new ZoomProviderImpl();
export default ZoomProvider;
