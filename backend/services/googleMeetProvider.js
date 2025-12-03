import path from 'path';
import fs from 'fs/promises';
import process from 'process';
import { authenticate } from '@google-cloud/local-auth';
import { SpacesServiceClient } from '@google-apps/meet';
import { auth as googleAuth } from 'google-auth-library';

const SCOPES = ['https://www.googleapis.com/auth/meetings.space.created'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content.toString());
    return googleAuth.fromJSON(credentials);
  } catch (err) {
    console.log(err);
    return null;
  }
}

async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content.toString());
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);

  return client;
}

/**
  * Load or request or authorization to call APIs.
  *
  */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

class googleMeetProviderImpl {
  async createMeeting(meetingData) {
    const authClient = await authorize();
    const meetClient = new SpacesServiceClient({ authClient: authClient });
    const request = {};
    const response = await meetClient.createSpace(request);
    return {
      join_url: response[0].meetingUri,
      ...response[0],
    };
  }

  async updateMeeting(meetingId, meetingData) {
    throw new Error('Update meeting not implemented for Google Meet API');
  }

  async deleteMeeting(meetingId) {
    throw new Error('Delete meeting not implemented for Google Meet API');
  }

  async getMeeting(meetingId) {
    throw new Error('Get meeting not implemented for Google Meet API');
  }
}

const GoogleMeetProvider = new googleMeetProviderImpl();
export default GoogleMeetProvider;
