"use client";

import { useState } from "react";
import { ScheduleSection } from "./schedule-section";
import { ContactsSection } from "./contacts-section";
import { ActionsSection } from "./actions-section";
import { EscalationSection } from "./escalation-section";
import { NotificationsSection } from "./notifications-section";
import { ProfileSection } from "./profile-section";
import type { ActionData, ContactData, ProfileData, ScheduleData, StepData } from "./types";

const TABS = [
  "Schedule",
  "Contacts",
  "Actions",
  "Escalation ladder",
  "Notifications",
  "Profile",
] as const;
type Tab = (typeof TABS)[number];

export function SettingsClient({
  initialSchedule,
  initialProfile,
  initialContacts,
  initialActions,
  initialSteps,
}: {
  initialSchedule: ScheduleData;
  initialProfile: ProfileData;
  initialContacts: ContactData[];
  initialActions: ActionData[];
  initialSteps: StepData[];
}) {
  const [tab, setTab] = useState<Tab>("Schedule");
  const [contacts, setContacts] = useState(initialContacts);
  const [actions, setActions] = useState(initialActions);

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-foreground">Settings</h1>
      <div className="mb-6 flex flex-wrap gap-1 rounded-lg border border-border bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              tab === t ? "bg-accent text-white" : "text-muted hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Schedule" && <ScheduleSection initial={initialSchedule} />}
      {tab === "Contacts" && <ContactsSection contacts={contacts} onChange={setContacts} />}
      {tab === "Actions" && (
        <ActionsSection actions={actions} contacts={contacts} onChange={setActions} />
      )}
      {tab === "Escalation ladder" && (
        <EscalationSection initialSteps={initialSteps} actions={actions} />
      )}
      {tab === "Notifications" && <NotificationsSection />}
      {tab === "Profile" && <ProfileSection initial={initialProfile} />}
    </div>
  );
}
