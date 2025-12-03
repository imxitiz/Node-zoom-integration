import Meeting from "./meeting.model.js";
import agenda from "../../utils/agenda.js";
import Email from "../../utils/sendEmail.js";
import appErrors from "../../utils/appErrors.js";
import apiFeatures from "../../utils/apiFeatures.js";
import asyncWrapper from "../../utils/asyncWrapper.js";
import serializeBody from "../../utils/serializeBody.js";
import { getMeetingProvider } from "../../services/meetingProvider.js";

// Create Zoom Meeting
export const createMeeting = asyncWrapper(async (req, res, next) => {
  const user = req.user;
  const requiredFields = ["agenda", "topic", "type"];
  const allowFields = ["duration", "schedule_for", "start_time", "end_time", "attendees", "provider"];
  const filterdData = serializeBody(
    req.body,
    next,
    requiredFields,
    allowFields
  );

  if (!filterdData) return;

  if (filterdData.type === 2 && !filterdData.duration) {
    return next(new appErrors("Duration is required", 400));
  }
  if (filterdData.type === 2 && !filterdData.start_time) {
    return next(new appErrors("Start time is required", 400));
  }

  if (filterdData?.agenda?.length > 2000) {
    return next(
      new appErrors("Agenda exceeds the maximum length of 2000 characters", 400)
    );
  }

  if (filterdData?.topic?.length > 200) {
    return next(
      new appErrors("Topic exceeds the maximum length of 200 characters", 400)
    );
  }

  const currentTime = new Date();

  if (filterdData?.start_time) {
    const meetingStartTime = new Date(filterdData.start_time);
    if (meetingStartTime <= currentTime) {
      return next(new appErrors("Start time should be in the future", 400));
    }
  }

  // check if user has already meet at this time will have at least half hour between two meeting
  if (filterdData.type == 2) {
    const newStartTime = new Date(filterdData.start_time);
    const thirtyMinutesInMillis = 30 * 60 * 1000;
    const userMeetings = await Meeting.find({ user: user._id });
    for (const meeting of userMeetings) {
      const meetingStart = new Date(meeting.start_time);
      const meetingEnd = new Date(meetingStart.getTime() + (meeting.duration * 60000 || thirtyMinutesInMillis));
      if (
        (newStartTime >= meetingStart && newStartTime < meetingEnd) ||
        (newStartTime < meetingStart && newStartTime + thirtyMinutesInMillis > meetingStart)
      ) {
        return next(
          new appErrors(
            "You already have a meeting scheduled in this time range. Please ensure there is at least a 30-minute gap between meetings.",
            400
          )
        );
      }
    }
  }

  // Select provider (default: zoom)
  const provider = filterdData.provider || 'zoom';
  const meetingProvider = getMeetingProvider(provider);

  try {
    // Prepare meetingData for provider
    const meetingData = {
      topic: filterdData.topic,
      agenda: filterdData.agenda,
      duration: filterdData.duration || 30,
      start_time: filterdData.start_time || new Date().toISOString(),
      end_time: filterdData.end_time,
      attendees: filterdData.attendees,
      type: filterdData.type,
      host_email: user.email,
      user,
    };
    const meetingResponse = await meetingProvider.createMeeting(meetingData);
    const meeting = await Meeting.create({
      user: user._id,
      zoom_url: meetingResponse.join_url,
      topic: filterdData.topic,
      type: filterdData.type,
      agenda: filterdData.agenda,
      duration: filterdData.duration || 30,
      start_time: filterdData.start_time || new Date().toISOString(),
      provider,
      provider_meeting_id: meetingResponse.id || meetingResponse.eventId,
    });
    if (filterdData.type == 1) {
      res.status(201).json({
        message: "Meeting created successfully",
        meeting,
      });
    } else {
      res.status(201).json({
        message: "Meeting scheduled successfully",
      });
      await agenda.schedule(filterdData.start_time, "send zoom url", {
        meetingId: meeting._id,
        meeting: meeting,
        user: {
          email: user.email,
          full_name: user.full_name,
        },
      });
    }
  } catch (error) {
    console.error("Error creating meeting:", error?.response?.data || error);
    return next(new appErrors(error, 500));
  }
});

// meeting list
export const meetingList = asyncWrapper(async (req, res, next) => {
  const user = req.user._id;
  const { status } = req.query;

  const timeNow = Date.now();
  const THIRTY_MIN = 30 * 60 * 1000;
  let timeFilter = {};
  if (status === "upcoming") {
    timeFilter = { $gte: timeNow - THIRTY_MIN };
  } else if (status === "previous") {
    timeFilter = { $lte: timeNow - THIRTY_MIN };
  }

  const query = { user };
  if (Object.keys(timeFilter).length) {
    query.start_time = timeFilter;
  }

  const features = new apiFeatures(Meeting.find(query), req.query).paginate(12);
  const meetings = await features.getPaginations(Meeting, req);

  meetings.results = meetings.results.map((meet) => {
    const startTime = new Date(meet.start_time).getTime();
    const duration = (meet.duration || 30) * 60 * 1000;
    const endTime = startTime + duration;
    const bufferMinutes = 5;
    const visibleBefore = startTime - bufferMinutes * 60 * 1000;

    if (!(timeNow >= visibleBefore && timeNow <= endTime)) {
      meet.zoom_url = null;
    }
    return meet;
  });

  res.status(200).json(meetings);
});

// upcoming meet
export const upcomingMeet = asyncWrapper(async (req, res, next) => {
  const user = req.user._id;

  const now = new Date();

  const inThirty = new Date(now.getTime() + 30 * 60 * 1000);
  const meet = await Meeting.findOne({
    user,
    $and: [{ start_time: { $gte: now } }, { start_time: { $lte: inThirty } }],
  });

  res.status(200).json({
    have_upcoming_meet: meet ? true : false,
    meet_time: meet
      ? new Date(meet.start_time).toLocaleTimeString("en-us", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      : null,
  });
});
//todya upcoming meet
export const todayUpcomingMeet = asyncWrapper(async (req, res, next) => {
  const user = req.user._id;

  const now = new Date();
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  ); // 00:00:00 of tomorrow

  const meetings = await Meeting.find({
    user: user,
    start_time: {
      $gte: now,
      $lt: endOfToday,
    },
  })
    .sort({ start_time: 1 })
    .limit(4);

  const timeNow = Date.now();
  let meetingList =
    meetings?.length > 0
      ? meetings.map((meet) => {
        const startTime = new Date(meet.start_time).getTime();
        const duration = (meet.duration || 30) * 60 * 1000;
        const endTime = startTime + duration;
        const bufferMinutes = 5;
        const visibleBefore = startTime - bufferMinutes * 60 * 1000;

        if (!(timeNow >= visibleBefore && timeNow <= endTime)) {
          meet.zoom_url = null;
        }

        return meet;
      })
      : [];
  res.status(200).json(meetingList);
});

agenda.define("send zoom url", async (job) => {
  const { meetingId, meeting, user } = job.attrs.data;

  try {
    await new Email(user, meeting).sendZoomUrl();

    await Meeting.findByIdAndUpdate(meetingId, {
      zoom_url: null,
    });
  } catch (err) {
    console.error("Failed to send Zoom URL email:", err);
  }
});
(async function () {
  await agenda.start();
})();
