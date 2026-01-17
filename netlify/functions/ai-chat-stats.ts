import {
  Handler,
  HandlerEvent,
  HandlerContext,
  HandlerResponse,
} from "@netlify/functions";
import { getDatabase } from "../../lib/mongodb";
import { verifyToken, extractToken } from "../../lib/auth";
import { HealthIncident } from "../../types/health";
import { StravaWorkout } from "../../types/strava";
import { LabResult } from "../../types/labs";
import {
  IncidentLocationStats,
  IncidentStats,
  SportStats,
  WorkoutStats,
  LabStats,
} from "../../types/ai-chat";
import {
  calculateWorkoutDistances,
  calculateTotalMovingTime,
  calculateElevationGain,
  formatWorkoutDistance,
} from "../../lib/workoutUtils";

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/**
 * GET /api/ai-chat-stats
 * Get aggregated statistics for health incidents, workouts, and lab results
 * This endpoint provides computed statistics to avoid sending large datasets to the AI
 * Requires authentication
 */
export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
): Promise<HandlerResponse> => {
  // Only allow GET requests
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Only GET requests are allowed",
        },
      } as ErrorResponse),
      headers: {
        "Content-Type": "application/json",
        "Allow": "GET",
      },
    };
  }

  try {
    // Verify authentication
    const token = extractToken(event.headers.authorization);
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: {
            code: "NO_TOKEN",
            message: "No authentication token provided",
          },
        } as ErrorResponse),
        headers: {
          "Content-Type": "application/json",
        },
      };
    }

    try {
      verifyToken(token);
    } catch (error) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: {
            code: "INVALID_TOKEN",
            message: "Invalid or expired token",
          },
        } as ErrorResponse),
        headers: {
          "Content-Type": "application/json",
        },
      };
    }

    const db = await getDatabase();

    // Get current year for year-specific queries
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);

    // ===== HEALTH INCIDENTS STATISTICS =====
    const incidentsCollection = db.collection<HealthIncident>('health-incidents');
    
    // Get all incidents
    const allIncidents = await incidentsCollection.find({}).toArray();
    
    // Group incidents by pain location
    const incidentsByLocation: Record<string, HealthIncident[]> = {};
    allIncidents.forEach(incident => {
      incident.painLocations.forEach(location => {
        if (!incidentsByLocation[location]) {
          incidentsByLocation[location] = [];
        }
        incidentsByLocation[location].push(incident);
      });
    });

    // Calculate stats for each location
    const incidentStats: Record<string, IncidentLocationStats> = {};
    Object.keys(incidentsByLocation).forEach(location => {
      const incidents = incidentsByLocation[location];
      const resolvedIncidents = incidents.filter(i => i.status.includes('resolved'));
      
      // Calculate average duration for resolved incidents
      const durationsInDays: number[] = [];
      resolvedIncidents.forEach(incident => {
        if (incident.endDate) {
          const duration = Math.ceil(
            (new Date(incident.endDate).getTime() - new Date(incident.dateStarted).getTime()) 
            / (1000 * 60 * 60 * 24)
          );
          durationsInDays.push(duration);
        }
      });

      // Calculate average time until pain drops below 3
      const timeToLowPain: number[] = [];
      incidents.forEach(incident => {
        if (incident.painIntensityOverTime && incident.painIntensityOverTime.length > 0) {
          const startDate = new Date(incident.dateStarted);
          for (const entry of incident.painIntensityOverTime) {
            if (entry.intensity < 3) {
              const daysToLowPain = Math.ceil(
                (new Date(entry.date).getTime() - startDate.getTime()) 
                / (1000 * 60 * 60 * 24)
              );
              timeToLowPain.push(daysToLowPain);
              break;
            }
          }
        }
      });

      // Calculate incidents per year
      const incidentYears: Record<number, number> = {};
      incidents.forEach(incident => {
        const year = new Date(incident.dateStarted).getFullYear();
        incidentYears[year] = (incidentYears[year] || 0) + 1;
      });
      const yearsWithIncidents = Object.keys(incidentYears).length;
      const avgIncidentsPerYear = yearsWithIncidents > 0 
        ? incidents.length / yearsWithIncidents 
        : 0;

      // Find last occurrence
      const sortedIncidents = incidents.sort((a, b) => 
        new Date(b.dateStarted).getTime() - new Date(a.dateStarted).getTime()
      );
      const lastIncident = sortedIncidents[0];

      incidentStats[location] = {
        totalCount: incidents.length,
        resolvedCount: resolvedIncidents.length,
        activeCount: incidents.filter(i => !i.status.includes('resolved')).length,
        lastOccurrence: lastIncident ? {
          date: lastIncident.dateStarted,
          description: lastIncident.description,
          painIntensity: lastIncident.painIntensity,
          status: lastIncident.status,
        } : null,
        averageDurationDays: durationsInDays.length > 0
          ? Math.round(durationsInDays.reduce((a, b) => a + b, 0) / durationsInDays.length)
          : null,
        averageDaysToLowPain: timeToLowPain.length > 0
          ? Math.round(timeToLowPain.reduce((a, b) => a + b, 0) / timeToLowPain.length)
          : null,
        averageIncidentsPerYear: Math.round(avgIncidentsPerYear * 10) / 10,
        incidentsByYear: incidentYears,
      };
    });

    // Overall incident stats
    const overallIncidentStats = {
      totalIncidents: allIncidents.length,
      activeIncidents: allIncidents.filter(i => !i.status.includes('resolved')).length,
      resolvedIncidents: allIncidents.filter(i => i.status.includes('resolved')).length,
      byLocation: incidentStats,
    };

    // ===== WORKOUT STATISTICS =====
    const workoutsCollection = db.collection<StravaWorkout>('strava-workouts');
    
    // Check if Strava is connected
    const tokensCollection = db.collection('strava-tokens');
    const stravaTokens = await tokensCollection.findOne({});
    
    let workoutStats: WorkoutStats | null = null;
    if (stravaTokens) {
      // Get all workouts
      const allWorkouts = await workoutsCollection.find({}).toArray();
      
      // Get workouts for this year
      const thisYearWorkouts = await workoutsCollection.find({
        start_date_local: { $gte: yearStart, $lte: yearEnd }
      }).toArray();

      // Group by sport type
      const workoutsBySport: Record<string, StravaWorkout[]> = {};
      allWorkouts.forEach(workout => {
        const sport = workout.sport_type || workout.type;
        if (!workoutsBySport[sport]) {
          workoutsBySport[sport] = [];
        }
        workoutsBySport[sport].push(workout);
      });

      // Calculate stats for each sport
      const sportStats: Record<string, SportStats> = {};
      Object.keys(workoutsBySport).forEach(sport => {
        const workouts = workoutsBySport[sport];
        
        // Filter workouts for this year (avoid duplicate date parsing)
        const thisYearSportWorkouts = workouts.filter(w => {
          const workoutDate = new Date(w.start_date_local);
          return workoutDate >= yearStart && workoutDate <= yearEnd;
        });
        
        // Find longest workout - handle empty array case
        const longestAllTime = workouts.length > 0 
          ? workouts.reduce((max, w) => w.distance > max.distance ? w : max)
          : null;
        
        const longestThisYear = thisYearSportWorkouts.length > 0 
          ? thisYearSportWorkouts.reduce((max, w) => w.distance > max.distance ? w : max)
          : null;

        // Calculate distances and elevation for all-time
        const allTimeDistances = calculateWorkoutDistances(workouts);
        const allTimeElevation = calculateElevationGain(workouts);
        const allTimeMovingTime = calculateTotalMovingTime(workouts);

        // Calculate distances and elevation for this year
        const thisYearDistances = calculateWorkoutDistances(thisYearSportWorkouts);
        const thisYearElevation = calculateElevationGain(thisYearSportWorkouts);
        const thisYearMovingTime = calculateTotalMovingTime(thisYearSportWorkouts);

        sportStats[sport] = {
          allTime: {
            count: workouts.length,
            totalDistanceMeters: allTimeDistances.meters,
            totalDistanceMiles: allTimeDistances.miles,
            totalDistanceKm: allTimeDistances.km,
            totalMovingTimeHours: allTimeMovingTime,
            totalElevationGainMeters: allTimeElevation.meters,
            totalElevationGainFeet: allTimeElevation.feet,
            longestWorkout: longestAllTime ? {
              name: longestAllTime.name,
              date: longestAllTime.start_date_local,
              ...formatWorkoutDistance(longestAllTime.distance),
            } : null,
          },
          thisYear: {
            count: thisYearSportWorkouts.length,
            totalDistanceMeters: thisYearDistances.meters,
            totalDistanceMiles: thisYearDistances.miles,
            totalDistanceKm: thisYearDistances.km,
            totalMovingTimeHours: thisYearMovingTime,
            totalElevationGainMeters: thisYearElevation.meters,
            totalElevationGainFeet: thisYearElevation.feet,
            longestWorkout: longestThisYear ? {
              name: longestThisYear.name,
              date: longestThisYear.start_date_local,
              ...formatWorkoutDistance(longestThisYear.distance),
            } : null,
          },
        };
      });

      workoutStats = {
        totalWorkouts: allWorkouts.length,
        workoutsThisYear: thisYearWorkouts.length,
        bySport: sportStats,
        currentYear,
      };
    }

    // ===== LAB RESULTS STATISTICS =====
    const labResultsCollection = db.collection<LabResult>('lab-results');
    
    // Get all lab results
    const allLabResults = await labResultsCollection
      .find({})
      .sort({ test_date: -1 })
      .toArray();

    // Get most recent results for common tests
    const latestLipidPanel = await labResultsCollection
      .findOne({ test_type: 'lipid_panel' }, { sort: { test_date: -1 } });

    const labStats = {
      totalResults: allLabResults.length,
      mostRecent: allLabResults.length > 0 ? {
        date: allLabResults[0].test_date,
        testType: allLabResults[0].test_type,
        orderedBy: allLabResults[0].ordered_by,
      } : null,
      latestLipidPanel: latestLipidPanel ? {
        date: latestLipidPanel.test_date,
        totalCholesterol: latestLipidPanel.total_cholesterol,
        ldlCholesterol: latestLipidPanel.ldl_cholesterol,
        hdlCholesterol: latestLipidPanel.hdl_cholesterol,
        triglycerides: latestLipidPanel.triglycerides,
        orderedBy: latestLipidPanel.ordered_by,
      } : null,
    };

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: {
          incidents: overallIncidentStats,
          workouts: workoutStats,
          labs: labStats,
          generatedAt: new Date().toISOString(),
        },
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };
  } catch (error) {
    console.error("AI chat stats error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while generating statistics",
        },
      } as ErrorResponse),
      headers: {
        "Content-Type": "application/json",
      },
    };
  }
};
