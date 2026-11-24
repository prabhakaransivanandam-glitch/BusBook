import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../server/package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(here, '../server/.env') });

const mongoose = require('mongoose');
const { connectDB } = await import('../server/src/config/db.js');
const Bus = (await import('../server/src/models/Bus.js')).default;
const Trip = (await import('../server/src/models/Trip.js')).default;
const Timetable = (await import('../server/src/models/Timetable.js')).default;
const { buildSeats, dateStringToDate } = await import('../server/src/services/tripService.js');

const BUSES = [
  { number: 'TN-01-BB-1001', type: 'AC Seater', totalSeats: 40 },
  { number: 'TN-01-BB-1002', type: 'AC Sleeper', totalSeats: 36 },
];

const TIMINGS = [
  { departureTime: '06:00', arrivalTime: '08:15', fare: 180 },
  { departureTime: '08:30', arrivalTime: '10:45', fare: 200 },
  { departureTime: '10:30', arrivalTime: '12:45', fare: 190 },
  { departureTime: '13:00', arrivalTime: '15:15', fare: 210 },
  { departureTime: '15:30', arrivalTime: '17:45', fare: 200 },
  { departureTime: '18:00', arrivalTime: '20:15', fare: 220 },
  { departureTime: '20:30', arrivalTime: '22:45', fare: 190 },
];

const DIRECTIONS = ['PERUNDURAI_TO_COIMBATORE', 'COIMBATORE_TO_PERUNDURAI'];

function dateStrings() {
  const now = new Date();
  return [0, 1].map((offset) => {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    return [
      day.getFullYear(),
      String(day.getMonth() + 1).padStart(2, '0'),
      String(day.getDate()).padStart(2, '0'),
    ].join('-');
  });
}

async function main() {
  await connectDB();
  console.log('[BusBook] Seeding buses, timetables and trips...');

  const buses = [];
  for (const data of BUSES) {
    const bus = await Bus.findOneAndUpdate(
      { number: data.number },
      { $set: data },
      { upsert: true, new: true },
    );
    buses.push(bus);
  }

  let tripCount = 0;
  let timetableCount = 0;

  for (const direction of DIRECTIONS) {
    for (const timing of TIMINGS) {
      const timetable = await Timetable.findOneAndUpdate(
        { direction, departureTime: timing.departureTime },
        {
          $set: {
            name: `${direction.split('_')[0]} ${timing.departureTime}`,
            bus: buses[tripCount % buses.length]._id,
            direction,
            ...timing,
            daysAhead: 7,
            active: true,
          },
        },
        { upsert: true, new: true },
      );
      timetableCount += 1;

      for (const date of dateStrings()) {
        const departureTime = dateStringToDate(date, timing.departureTime);
        if (departureTime.getTime() <= Date.now()) continue;

        const bus = buses[tripCount % buses.length];
        const result = await Trip.updateOne(
          { bus: bus._id, direction, date, departureTime },
          {
            $setOnInsert: {
              bus: bus._id,
              timetable: timetable._id,
              direction,
              date,
              departureTime,
              arrivalTime: dateStringToDate(date, timing.arrivalTime),
              totalSeats: bus.totalSeats,
              seats: buildSeats(bus.totalSeats),
              fare: timing.fare,
              status: 'scheduled',
            },
          },
          { upsert: true },
        );
        tripCount += result.upsertedCount || 0;
      }
    }
  }

  console.log(`[BusBook] Done: ${buses.length} buses, ${timetableCount} timetables, ${tripCount} new trips.`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('[BusBook] Seed failed:', error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
