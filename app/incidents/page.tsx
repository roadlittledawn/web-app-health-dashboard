'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  IconButton,
  Toolbar,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  LocalHospital,
  Add,
  ArrowBack,
  Edit,
  Visibility,
} from '@mui/icons-material';
import { HealthIncident } from '@/types/health';
import { formatLocalDateTime } from '@/lib/dateUtils';

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<HealthIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/incidents-query', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch incidents');
      }

      const data = await response.json();
      setIncidents(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = (status: any) => {
    if (status.resolved) return 'resolved';
    if (status.improving) return 'improving';
    if (status.worsening) return 'active';
    return 'unknown';
  };

  const getStatusColor = (status: any) => {
    const display = getStatusDisplay(status);
    switch (display) {
      case 'resolved': return 'success';
      case 'improving': return 'warning';
      case 'active': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <AppBar position="static" sx={{ mb: 3 }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => router.push('/dashboard')}>
            <ArrowBack />
          </IconButton>
          <LocalHospital sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Health Incidents
          </Typography>
          <Button
            color="inherit"
            startIcon={<Add />}
            component={Link}
            href="/incidents/add"
          >
            New Incident
          </Button>
        </Toolbar>
      </AppBar>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {incidents.map((incident) => (
          <Grid item xs={12} md={6} key={incident._id?.toString()}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Typography variant="h6" component="h2">
                    {incident.painLocations}
                  </Typography>
                  <Chip
                    label={getStatusDisplay(incident.status)}
                    color={getStatusColor(incident.status) as any}
                    size="small"
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Started: {formatLocalDateTime(incident.dateStarted)}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Pain Level: {incident.painIntensity}/10
                </Typography>
                
                <Typography variant="body2" paragraph>
                  {incident.description}
                </Typography>

                <Box display="flex" gap={1} mt={2}>
                  <Button
                    size="small"
                    startIcon={<Visibility />}
                    component={Link}
                    href={`/incidents/${incident._id}`}
                  >
                    View Details
                  </Button>
                  <Button
                    size="small"
                    startIcon={<Edit />}
                    component={Link}
                    href={`/incidents/edit/${incident._id}`}
                  >
                    Edit
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {incidents.length === 0 && !loading && (
        <Box textAlign="center" py={8}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No incidents found
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            component={Link}
            href="/incidents/add"
          >
            Create Your First Incident
          </Button>
        </Box>
      )}
    </Container>
  );
}
