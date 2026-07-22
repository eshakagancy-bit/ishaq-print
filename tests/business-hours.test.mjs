import assert from "node:assert/strict";
import test from "node:test";

import {
  ADEN_TIME_ZONE,
  formatArabicBusinessHours,
  isOpenInAden,
  sanitizePhoneNumber,
} from "../app/business-hours.ts";

const settings = {
  workWeekdays: "sat,sun,mon,tue,wed,thu",
  workStartTime: "09:30",
  workEndTime: "22:00",
};

test("uses Yemen time and closes on Friday", () => {
  assert.equal(ADEN_TIME_ZONE, "Asia/Aden");
  assert.equal(isOpenInAden(new Date("2026-07-18T06:30:00Z"), settings), true, "Saturday 09:30 in Aden should be open");
  assert.equal(isOpenInAden(new Date("2026-07-18T06:29:00Z"), settings), false, "Saturday 09:29 in Aden should be closed");
  assert.equal(isOpenInAden(new Date("2026-07-18T19:00:00Z"), settings), false, "Saturday 22:00 in Aden should be closed");
  assert.equal(isOpenInAden(new Date("2026-07-17T09:00:00Z"), settings), false, "Friday should always be closed");
});

test("formats structured work times and sanitizes phone inputs", () => {
  assert.equal(formatArabicBusinessHours("09:30", "22:00"), "9:30 صباحًا – 10:00 مساءً");
  assert.equal(sanitizePhoneNumber(" +967 777-000-725 "), "967777000725");
  assert.equal(sanitizePhoneNumber("967abc777"), "967777");
});
