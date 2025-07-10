import { Request, Response } from 'express';
import db from '../config/db';
import axios from 'axios';
    interface Zone {
      Id: number;
      ZoneName: string;
      ZoneManager: string;
      Latitude: number;
      Longitude: number;
      Distance?: number | string;
      HelpersPriorityOneList?: string;
      HelpersPriorityTwoList?: string;
      HelpersPriorityThreeList?: string;
      Status: number;
    }

    // {
//   "latitude": 12.971891,
//   "longitude": 77.614228
// }
export const getZoneHelpers = async (req: Request, res: Response): Promise<void> => {
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    res.status(400).json({ error: 'Latitude and Longitude are required' });
    return;
  }

  const batchSize = 24;
  let offset = 0;

  while (true) {
    const zonesQuery = await db.raw(`
      SELECT *
      FROM [dbo].[ZoneDetails]
      WHERE Status = 1
      ORDER BY Id
      OFFSET ${offset} ROWS FETCH NEXT ${batchSize} ROWS ONLY
    `);
    const zones = zonesQuery || [];

    if (zones.length === 0) break;

    const origins: string = (zones as Zone[]).map((z: Zone) => `${z.Latitude},${z.Longitude}`).join(';');
    const destination = `${latitude},${longitude}`;

    const apiUrl = `https://trueway-matrix.p.rapidapi.com/CalculateDrivingMatrix?origins=${origins}&destinations=${destination}`;
    const headers = {
      'X-RapidAPI-Key': '26316efa52msha685cf57921d82fp1d1282jsn1cdda173ccb9',
      'X-RapidAPI-Host': 'trueway-matrix.p.rapidapi.com',
      'Content-Type': 'application/json'
    };

    try {
      const response = await axios.get(apiUrl, { headers });
      const distances = response.data?.distances;

      if (!distances) {
        offset += batchSize;
        continue;
      }

      const matchedZones = [];

      for (let i = 0; i < zones.length; i++) {
        const dist = parseFloat(distances[i]);
        const allowedDistance = parseFloat(zones[i].Distance || 5000); // fallback 5km

        if (dist <= allowedDistance) {
          matchedZones.push({
            zone_id: zones[i].Id,
            zone_name: zones[i].ZoneName,
            zone_manager: zones[i].ZoneManager,
            distance: dist,
            helpers: {
              priority_one: zones[i].HelpersPriorityOneList?.split(',') || [],
              priority_two: zones[i].HelpersPriorityTwoList?.split(',') || [],
              priority_three: zones[i].HelpersPriorityThreeList?.split(',') || [],
              all: [
                ...(zones[i].HelpersPriorityOneList?.split(',') || []),
                ...(zones[i].HelpersPriorityTwoList?.split(',') || []),
                ...(zones[i].HelpersPriorityThreeList?.split(',') || [])
              ]
            }
          });
        }
      }

      if (matchedZones.length > 0) {
        res.status(200).json({
          message: 'Zones matched',
          data: matchedZones
        });
        return;
      }
    } catch (error) {
      console.error('RapidAPI Error:', error instanceof Error ? error.message : error);
      res.status(500).json({ error: 'Failed to fetch distances from RapidAPI' });
      return;
    }

    offset += batchSize;
  }

  res.status(200).json({
    message: 'No zone matched within distance',
    data: []
  });
};