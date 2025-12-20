'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  List,
  ListItem,
  ListItemText,
  Toolbar,
  Typography,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Add,
} from '@mui/icons-material';
import { HealthIncident, HealthLog } from '@/types/health';
import { formatLocalDateTime } from '@/lib/dateUtils';
import Link from 'next/link';

export default function IncidentDetailPage() {
  const [incident, setIncident] = useState<HealthIncident | null>(null);
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const params = useParams();
  const incidentId = params.id as string;

  useEffect(() => {
    if (incidentId) {
      fetchIncidentData();
    }
  }, [incidentId]);

  const fetchIncidentData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      // Fetch incident details
      const incidentResponse = await fetch(`/api/incidents-query?_id=${incidentId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!incidentResponse.ok) throw new Error('Failed to fetch incident');
      const incidentData = await incidentResponse.json();
      setIncident(incidentData.data[0]);

      // Fetch associated logs
      const logsResponse = await fetch(`/api/health-logs-query?incident_id=${incidentId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!logsResponse.ok) throw new Error('Failed to fetch logs');
      const logsData = await logsResponse.json();
      setLogs(logsData.data);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!incident) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error">Incident not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <AppBar position="static" sx={{ mb: 3 }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => router.push('/incidents')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {incident.painLocations.join(', ') || 'Incident Details'}
          </Typography>
          <Button
            color="inherit"
            startIcon={<Edit />}
            component={Link}
            href={`/incidents/edit/${incidentId}`}
          >
            Edit
          </Button>
        </Toolbar>
      </AppBar>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                  <Typography variant="h5" gutterBottom>
                    {incident.painLocations.join(', ') || 'No location specified'}
                  </Typography>
                  <Box display="flex" gap={0.5} flexWrap="wrap">
                    {incident.painLocations.map((location, idx) => (
                      <Chip
                        key={idx}
                        label={location}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>
                <Chip
                  label={incident.status.resolved ? 'resolved' : incident.status.improving ? 'improving' : 'active'}
                  color={incident.status.resolved ? 'success' : 'warning'}
                />
              </Box>
              
              <Typography variant="body1" paragraph>{incident.description}</Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Date Started</Typography>
                  <Typography variant="body2">{formatLocalDateTime(incident.dateStarted)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Pain Intensity</Typography>
                  <Typography variant="body2">{incident.painIntensity}/10</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Log Entries</Typography>
                <Button
                  startIcon={<Add />}
                  component={Link}
                  href={`/health-logs/add?incident_id=${incidentId}`}
                >
                  Add Entry
                </Button>
              </Box>
              
              {logs.length === 0 ? (
                <Typography color="text.secondary">No log entries yet</Typography>
              ) : (
                <List>
                  {logs.map((log, index) => (
                    <div key={log._id?.toString()}>
                      <ListItem>
                        <ListItemText
                          primary={log.description}
                          secondary={
                            <Box>
                              <Typography variant="caption" display="block">
                                {formatLocalDateTime(log.timestamp)}
                              </Typography>
                              <Chip size="small" label={log.issue_type} />
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < logs.length - 1 && <Divider />}
                    </div>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Symptoms</Typography>
              {/* Display symptoms data - simplified for now */}
              <Typography variant="body2">
                Status: {Object.entries(incident.status)
                  .filter(([_, value]) => value)
                  .map(([key]) => key)
                  .join(', ') || 'None specified'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
