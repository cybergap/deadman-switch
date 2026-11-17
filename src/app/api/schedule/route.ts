import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRead, requireAdminWrite, errorResponse } from "@/lib/api";
import { getCheckInChannels, getScheduleConfig } from "@/lib/checkin";
import { DURATION_UNITS, CHECKIN_CHANNELS } from "@/lib/constants";

const schema = z.object({
  intervalValue: z.number().int().min(1).max(3650),
  intervalUnit: z.enum(DURATION_UNITS),
  graceValue: z.number().int().min(1).max(3650),
  graceUnit: z.enum(DURATION_UNITS),
  checkInChannels: z.array(z.enum(CHECKIN_CHANNELS)).min(1),
  timezone: z.string().min(1).max(100),
});

export async function GET() {
  try {
    await requireAdminRead();
    const schedule = await getScheduleConfig();
    return NextResponse.json({
      intervalValue: schedule.intervalValue,
      intervalUnit: schedule.intervalUnit,
      graceValue: schedule.graceValue,
      graceUnit: schedule.graceUnit,
      checkInChannels: getCheckInChannels(schedule),
      timezone: schedule.timezone,
      isPaused: schedule.isPaused,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdminWrite(request);
    const body = schema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid schedule settings." }, { status: 400 });
    }

    await prisma.scheduleConfig.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        intervalValue: body.data.intervalValue,
        intervalUnit: body.data.intervalUnit,
        graceValue: body.data.graceValue,
        graceUnit: body.data.graceUnit,
        checkInChannels: JSON.stringify(body.data.checkInChannels),
        timezone: body.data.timezone,
      },
      update: {
        intervalValue: body.data.intervalValue,
        intervalUnit: body.data.intervalUnit,
        graceValue: body.data.graceValue,
        graceUnit: body.data.graceUnit,
        checkInChannels: JSON.stringify(body.data.checkInChannels),
        timezone: body.data.timezone,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
