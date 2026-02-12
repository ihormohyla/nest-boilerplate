import { DateTime } from 'luxon';

export const nowUtc = () => DateTime.utc();

export const formatISO = (date: Date | string | number | DateTime) =>
  date instanceof DateTime ? date.toISO() : DateTime.fromJSDate(new Date(date)).toISO();

export const parseISO = (value: string) => DateTime.fromISO(value, { zone: 'utc' });
