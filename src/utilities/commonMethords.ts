import db from "../config/db";


export const getTerms = async (key: string) => {
  const terms = await db('GeneralSettings').where({ title: key }).select('*');
  return terms || [];
};

export function timeStringToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTimeString(mins: number): string {
  let hours = Math.floor(mins / 60);
  let minutes = mins % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  if (hours === 0) hours = 12;
  if (hours > 12) hours -= 12;
  return (
    (hours < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes + ' ' + ampm
  );
}

export async function getGeneralSetting(key: string): Promise<number> {
  const row = await db('GeneralSettings').where('title', key).first();
  return Number(row?.SettingValue || 0);
}

export function getAvailableTimings(
  allocated_hours: { st: number; end: number }[],
  requestedStart: number,
  jobDuration: number,
  breakMinutes: number,
  min_time: number = 360,
  max_time: number = 1080
) {
  const requestedEnd = requestedStart + jobDuration + breakMinutes;
  let conflict = false;

  for (const slot of allocated_hours) {
    if (
      (requestedStart >= slot.st && requestedStart < slot.end) ||
      (requestedEnd > slot.st && requestedEnd <= slot.end) ||
      (requestedStart <= slot.st && requestedEnd >= slot.end)
    ) {
      conflict = true;
      break;
    }
  }

  if (!conflict && requestedStart >= min_time && requestedEnd <= max_time) {
    return {
      returnValue: minutesToTimeString(requestedStart),
      suggested_t1: '',
      suggested_t2: '',
    };
  }

  // Suggest alternate time slots
  let suggested_t1 = '';
  let suggested_t2 = '';

  // Previous slot
  let prev = requestedStart - 30;
  while (prev >= min_time) {
    const prevEnd = prev + jobDuration + breakMinutes;
    if (
      !allocated_hours.some(
        (slot) =>
          (prev >= slot.st && prev < slot.end) ||
          (prevEnd > slot.st && prevEnd <= slot.end) ||
          (prev <= slot.st && prevEnd >= slot.end)
      )
    ) {
      suggested_t1 = minutesToTimeString(prev);
      break;
    }
    prev -= 15;
  }

  // Next slot
  let next = requestedStart + 15;
  while (next + jobDuration + breakMinutes <= max_time) {
    const nextEnd = next + jobDuration + breakMinutes;
    if (
      !allocated_hours.some(
        (slot) =>
          (next >= slot.st && next < slot.end) ||
          (nextEnd > slot.st && nextEnd <= slot.end) ||
          (next <= slot.st && nextEnd >= slot.end)
      )
    ) {
      suggested_t2 = minutesToTimeString(next);
      break;
    }
    next += 15;
  }

  return {
    returnValue: '',
    suggested_t1,
    suggested_t2,
  };
}

export const getJobTitle = async (itemsId: string): Promise<string> => {
  if (!itemsId) return '';

  const jobIds = itemsId.split(',').map(id => id.trim()).filter(Boolean);
  if (jobIds.length === 0) return '';

  const jobTitles = await db('JobsTable')
    .whereIn('JobId', jobIds)
    .pluck('JobTitle');

  return jobTitles.join(', ');
};

export const checkAddonsCount = (addonsMapped: string): number => {
  if (!addonsMapped || addonsMapped === 'undefined') return 0;

  try {
    const parsed = JSON.parse(addonsMapped);
    let count = 0;

    for (const jobKey in parsed) {
      const addons = parsed[jobKey];
      if (typeof addons === 'object') {
        count += Object.keys(addons).length;
      }
    }

    return count;
  } catch (err) {
    console.error('Error parsing AddonsMapped:', err);
    return 0;
  }
};

export const getJobImage = async (jobIdCsv: string): Promise<string[]> => {
  if (!jobIdCsv) return [];

  const jobIds = jobIdCsv.split(',').map(id => id.trim());
  const allJobs = await db('JobsTable').select('JobId', 'JobImage');

  const images: string[] = [];

  for (const jobId of jobIds) {
    const match = allJobs.find(j => j.JobId?.split(',').includes(jobId));
    if (match && match.JobImage) {
      images.push(match.JobImage);
    }
  }

  return images;
};
// export const getJobTitle = async (jobIdCsv: string): Promise<string[]> => {
//   if (!jobIdCsv) return [];

//   const jobIds = jobIdCsv.split(',').map(id => id.trim());
//   const allJobs = await db('JobsTable').select('JobId', 'JobTitle');

//   const titles: string[] = [];

//   for (const jobId of jobIds) {
//     const match = allJobs.find(j => j.JobId?.split(',').includes(jobId));
//     if (match && match.JobTitle) {
//       titles.push(match.JobTitle);
//     }
//   }

//   return titles;
// };