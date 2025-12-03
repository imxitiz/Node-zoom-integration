import React, { useEffect, useState } from "react";
import Hero from "./Hero";
import Button from "../../components/ui/Button";
import { CalendarIcon, PlusIcon } from "../../assets/Icon";
import Card from "../../components/ui/Card";
import Meeting_Card from "../meeting/Meeting_Card";
import Dialog from "../../components/ui/Dialog";
import Form from "../../components/ui/form/Form";
import { useForm } from "react-hook-form";
import axiosInstance from "../../services/axiosInstance";
import { toast } from "react-toastify";
import useGetPaginatedData from "../../hooks/useGetPaginatedData";
import Empty from "../../components/ui/Empty";
import useGetData from "../../hooks/useGetData";

interface sendDataType {
  topic: string;
  agenda: string;
  duration: number;
  start_time: number;
  type: number;
  provider: string;
}
const PROVIDERS = [
  { label: "Zoom", value: "zoom" },
  { label: "Google Meet", value: "google" },
];

const Home = () => {
  const [visible, setVisible] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [meetingType, setMeetingType] = useState<string | null>(null);
  const [provider, setProvider] = useState<string>(PROVIDERS[0].value);

  const { data, fetchData } = useGetData(`/api/meet/today`);

  // ___________________ use form ____________________
  const {
    control,
    setError,
    reset,
    formState: { errors, dirtyFields, isDirty },
    handleSubmit,
  } = useForm({
    defaultValues: { topic: "" },
    mode: "onChange",
  });
  const list = [
    {
      id: 0,
      icon: <PlusIcon width="24" height="24" />,
      title: "New Meeting",
      description: "Setup a new recording",
      action: () => {
        setVisible(true);
        setMeetingType("meet");
      },
      className: "bg-[#FF742E]"
    },
    {
      id: 1,
      icon: <CalendarIcon width="24" height="24" />,
      title: "Schedule Meeting",
      description: "Plan your meeting",
      action: () => {
        setVisible(true);
        setMeetingType("schedule");
      },
      className: "bg-[#830EF9]"
    },
  ];
  const formList = [
    {
      id: 0,
      formType: "input" as const,
      type: "text",
      fieldName: "topic",
      validator: {
        required: "Topic is required",
        maxLength: {
          value: 100,
          message: "Topic should be less than 100 characters",
        },
      },
      label: "Topic",
      placeholder: "Enter meeting topic",
    },
    // Only include the schedule field if needed
    ...(meetingType === "schedule"
      ? [
        {
          id: 1,
          formType: "input",
          type: "datetime-local",
          fieldName: "start_time",
          validator: {
            required: "Date & Time is required",
          },
          label: "Date & Time",
          placeholder: "Select Date & Time",
        },
      ]
      : []),
    {
      id: 5,
      formType: "textarea",
      fieldName: "agenda",
      validator: {
        required: "Agenda is required",
        maxLength: {
          value: 500,
          message: "Agenda should be less than 500 characters",
        },
      },
      label: "Agenda",
      placeholder: "Enter meeting agenda",
    },
  ];
  const onSubmit = async (data: any) => {
    try {
      setLoading(true);
      const { topic, agenda, start_time } = data;
      const sendData: sendDataType & { provider: string } = {
        topic,
        agenda,
        start_time:
          meetingType === "meet"
            ? new Date(new Date().getTime() + 20 * 60 * 1000).toISOString()
            : start_time,
        duration: 30,
        type: meetingType === "meet" ? 1 : 2,
        provider,
      };

      const response = await axiosInstance.post("/api/meet/zoom", sendData);

      if (response?.status === 201) {
        toast.success("Meeting created successfully");
        setVisible(false);
        reset();
        if (response.data?.meeting) {
          window.location.href = response.data.meeting.zoom_url;
        }
        fetchData();
      }
    } catch (err) {
      console.log("error", err);
      const errorMessage =
        (err as any)?.response?.data?.errors ||
        (err as any)?.message ||
        "An error occurred";
      toast.error(errorMessage);
      setVisible(false);
      reset();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);
  return (
    <section className="flex flex-col gap-8">
      <Hero />
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {list?.map((item) => (
          <Card key={item?.id} data={item} />
        ))}
      </section>
      {data?.length > 0 && (
        <section className="grid gap-3.5">
          <h3 className="text-2xl font-bold">Today’s Upcoming Meetings</h3>
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.map((item: any) => (
              <Meeting_Card key={item?.meetingId} data={item} />
            ))}
          </section>
        </section>
      )}

      <Dialog
        header={
          meetingType === "schedule"
            ? "Schedule a new meeting"
            : "Create Meeting"
        }
        visibility={visible}
        onClose={() => {
          setVisible(false);
        }}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <div className="grid gap-4">
            {/* Provider Dropdown */}
            <div className="flex flex-col gap-2">
              <label htmlFor="provider" className="text-base capitalize">
                Meeting Provider
              </label>
              <select
                id="provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="input border-blue-800"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <Form
              formList={formList}
              control={control}
              errors={errors as any}
              loading={loading}
            />
          </div>
          <Button buttonType="submit" loading={loading} className="!w-full">
            {meetingType === "schedule" ? "Schedule" : "Create"} Meeting
          </Button>
        </form>
      </Dialog>
    </section>
  );
};

export default Home;
