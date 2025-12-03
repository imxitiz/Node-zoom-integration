import type { AxiosInstance } from "axios";
import axios from "axios";

class ZoomClient {
  private client: AxiosInstance;
  private accountId: string;
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiration: number = 0;

  constructor() {
    this.accountId = process.env.ZOOM_ACCOUNT_ID!;
    this.clientId = process.env.ZOOM_CLIENT_ID!;
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET!;

    this.client = axios.create({
      baseURL: "https://api.zoom.us/v2",
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

  private async getAccessToken() {
    const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${this.accountId}`;
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      "base64"
    );
    try {
      const response = await axios.post(
        tokenUrl,
        {},
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );
      this.accessToken = response.data.access_token;
      this.tokenExpiration =
        Date.now() + response.data.expires_in * 1000 - 60000; // Refresh 1 minute before expiration
    } catch (error: any) {
      logger.error(
        "Failed to get Zoom access token:",
        error.response?.data || error.message
      );
      throw new Error("Failed to get Zoom access token");
    }
  }

  async createMeeting(meetingData: any) {
    try {
      const response = await this.client.post(
        "/users/me/meetings",
        meetingData
      );
      return response.data;
    } catch (error: any) {
      logger.error(
        "Zoom API Error - Create Meeting:",
        error.response?.data || error.message
      );
      throw new Error("Failed to create Zoom meeting");
    }
  }

  async updateMeeting(meetingId: string, meetingData: any) {
    try {
      const response = await this.client.patch(
        `/meetings/${meetingId}`,
        meetingData
      );
      return response.data;
    } catch (error: any) {
      logger.error(
        "Zoom API Error - Update Meeting:",
        error.response?.data || error.message
      );
      throw new Error("Failed to update Zoom meeting");
    }
  }

  async deleteMeeting(meetingId: string) {
    try {
      await this.client.delete(`/meetings/${meetingId}`);
    } catch (error: any) {
      logger.error(
        "Zoom API Error - Delete Meeting:",
        error.response?.data || error.message
      );
      throw new Error("Failed to delete Zoom meeting");
    }
  }

  async getMeeting(meetingId: string) {
    try {
      const response = await this.client.get(`/meetings/${meetingId}`);
      return response.data;
    } catch (error: any) {
      logger.error(
        "Zoom API Error - Get Meeting:",
        error.response?.data || error.message
      );
      throw new Error("Failed to get Zoom meeting");
    }
  }
}

export default new ZoomClient();
