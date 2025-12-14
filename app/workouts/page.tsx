'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Toolbar,
  Typography,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack,
  FitnessCenter,
  Sync,
  Link as LinkIcon,
  EmojiEvents,
  DirectionsRun,
  DirectionsBike,
  Pool,
  Hiking,
} from '@mui/icons-material';

interface Workout {
  _id: string;
  strava_id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date: string;
  distance: number;
  moving_time: number;
  total_elevation_gain: number;
  average_heartrate?: number;
  calories?: number;
}

export default function WorkoutsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    // Check for OAuth callback messages
    if (searchParams.get('connected') === 'true') {
      setConnected(true);
    }
    if (searchParams.get('error')) {
      setError(searchParams.get('error') || '');
    }

    fetchWorkouts();
  }, []);

  const fetchWorkouts = async () => {
    setLoading(true);
    setError('');

    const token = localStorage.getItem('auth-token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const params = new URLSearchParams({ limit: '50' });
      if (filter) params.append('type', filter);

      const response = await fetch(`/api/strava-workouts?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setWorkouts(data.data);
        setConnected(true);
      } else if (response.status === 404) {
        // Strava not connected
        setConnected(false);
      } else {
        throw new Error('Failed to fetch workouts');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load workouts');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError('');

    const token = localStorage.getItem('auth-token');

    try {
      const response = await fetch('/api/strava-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ perPage: 50 }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Sync failed');
      }

      // Refresh workouts list
      await fetchWorkouts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleConnect = () => {
    const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID || '140054';
    const redirectUri = `${window.location.origin}/api/strava-oauth`;
    const scope = 'read,activity:read_all';

    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`;

    window.location.href = authUrl;
  };

  const formatDistance = (meters: number) => {
    const miles = meters * 0.000621371;
    return `${miles.toFixed(2)} mi`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatPace = (distance: number, time: number) => {
    if (!distance || !time) return '--:--';
    const metersPerSecond = distance / time;
    const secondsPerMile = 1609.34 / metersPerSecond;
    const minutes = Math.floor(secondsPerMile / 60);
    const seconds = Math.floor(secondsPerMile % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}/mi`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'Run': return <DirectionsRun />;
      case 'Ride': return <DirectionsBike />;
      case 'Swim': return <Pool />;
      case 'Hike': return <Hiking />;
      default: return <FitnessCenter />;
    }
  };

  const stats = workouts.reduce((acc, w) => {
    acc.totalDistance += w.distance || 0;
    acc.totalTime += w.moving_time || 0;
    acc.totalElevation += w.total_elevation_gain || 0;
    return acc;
  }, { totalDistance: 0, totalTime: 0, totalElevation: 0 });

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Button
            color="inherit"
            component={Link}
            href="/dashboard"
            startIcon={<ArrowBack />}
            sx={{ mr: 2 }}
          >
            Dashboard
          </Button>
          <FitnessCenter sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Workouts
          </Typography>
          {connected && (
            <Button
              color="inherit"
              component={Link}
              href="/workouts/goals"
              startIcon={<EmojiEvents />}
              sx={{ mr: 2 }}
            >
              Goals
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {connected && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setConnected(null)}>
            Strava account connected successfully!
          </Alert>
        )}

        {/* Connection Status */}
        {!loading && connected === false && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Connect to Strava
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Connect your Strava account to sync workouts and track fitness goals.
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<LinkIcon />}
                  onClick={handleConnect}
                  sx={{ bgcolor: '#FC4C02', '&:hover': { bgcolor: '#E34402' } }}
                >
                  Connect Strava
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Stats Summary */}
        {connected && workouts.length > 0 && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    Total Distance
                  </Typography>
                  <Typography variant="h5">
                    {formatDistance(stats.totalDistance)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    Total Time
                  </Typography>
                  <Typography variant="h5">
                    {formatDuration(stats.totalTime)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    Total Elevation
                  </Typography>
                  <Typography variant="h5">
                    {Math.round(stats.totalElevation * 3.28084).toLocaleString()} ft
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Controls */}
        {connected && (
          <Box display="flex" gap={2} mb={3} alignItems="center">
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Activity Type</InputLabel>
              <Select
                value={filter}
                label="Activity Type"
                onChange={(e) => {
                  setFilter(e.target.value);
                  fetchWorkouts();
                }}
              >
                <MenuItem value="">All Activities</MenuItem>
                <MenuItem value="Run">Run</MenuItem>
                <MenuItem value="Ride">Ride</MenuItem>
                <MenuItem value="Swim">Swim</MenuItem>
                <MenuItem value="Hike">Hike</MenuItem>
                <MenuItem value="Walk">Walk</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={syncing ? <CircularProgress size={20} /> : <Sync />}
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? 'Syncing...' : 'Sync Activities'}
            </Button>
          </Box>
        )}

        {/* Workouts List */}
        {loading && (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        )}

        {!loading && connected && workouts.length === 0 && (
          <Alert severity="info">
            No workouts found. Click "Sync Activities" to import from Strava.
          </Alert>
        )}

        {!loading && connected && (
          <Grid container spacing={2}>
            {workouts.map((workout) => (
              <Grid item xs={12} key={workout._id}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="start">
                      <Box display="flex" gap={2} alignItems="start">
                        <Box sx={{ color: 'primary.main', mt: 0.5 }}>
                          {getActivityIcon(workout.type)}
                        </Box>
                        <Box>
                          <Typography variant="h6">
                            {workout.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {new Date(workout.start_date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </Typography>
                          <Box display="flex" gap={2} mt={1} flexWrap="wrap">
                            <Typography variant="body2">
                              <strong>Distance:</strong> {formatDistance(workout.distance)}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Time:</strong> {formatDuration(workout.moving_time)}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Pace:</strong> {formatPace(workout.distance, workout.moving_time)}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Elevation:</strong> {Math.round(workout.total_elevation_gain * 3.28084)} ft
                            </Typography>
                            {workout.average_heartrate && (
                              <Typography variant="body2">
                                <strong>Avg HR:</strong> {Math.round(workout.average_heartrate)} bpm
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </Box>
                      <Chip label={workout.sport_type} size="small" />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
}
