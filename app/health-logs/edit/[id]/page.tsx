'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  AppBar,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Toolbar,
  Typography,
  Alert,
  Slider,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack,
  Save,
} from '@mui/icons-material';
import { formatForDateTimeLocal } from '@/lib/dateUtils';

interface IncidentOption {
  incident_id: string;
  issue_type: string;
  last_log: Date;
  status: string;
}

interface AutocompleteData {
  incident_ids: IncidentOption[];
}

export default function EditHealthLogPage() {
  const router = useRouter();
  const params = useParams();
  const logId = params.id as string;
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [autocompleteData, setAutocompleteData] = useState<AutocompleteData>({
    incident_ids: [],
  });

  const [formData, setFormData] = useState({
    incident_id: '',
    issue_type: 'update' as 'update' | 'doctor_visit_notes',
    description: '',
    timestamp: formatForDateTimeLocal(new Date()),
  });

  // Fetch existing log data and autocomplete data on mount
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Validate MongoDB ObjectId format (24 hex characters)
      if (!logId || !/^[a-fA-F0-9]{24}$/.test(logId)) {
        setFetchError('Invalid health log ID format');
        setLoading(false);
        return;
      }

      try {
        // Fetch autocomplete data
        const autocompleteResponse = await fetch('/api/health-logs-autocomplete', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (autocompleteResponse.ok) {
          const data = await autocompleteResponse.json();
          setAutocompleteData(data.data);
        }

        // Fetch existing log data
        const params = new URLSearchParams({ _id: logId });
        const logResponse = await fetch(`/api/health-logs-query?${params}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!logResponse.ok) {
          throw new Error('Failed to fetch health log');
        }

        const logData = await logResponse.json();
        if (logData.data && logData.data.length > 0) {
          const log = logData.data[0];
          setFormData({
            incident_id: log.incident_id || '',
            issue_type: log.issue_type || 'update',
            description: log.description || '',
            timestamp: log.timestamp ? formatForDateTimeLocal(log.timestamp) : formatForDateTimeLocal(new Date()),
          });
        } else {
          throw new Error('Health log not found');
        }
      } catch (err: any) {
        console.error('Failed to fetch data:', err);
        setFetchError(err.message || 'Failed to load health log');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, logId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const token = localStorage.getItem('auth-token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await fetch('/api/health-logs-update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: logId,
          updates: {
            ...formData,
            timestamp: new Date(formData.timestamp).toISOString(),
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to update health log');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/health-logs');
      }, 1500);
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <Button
              color="inherit"
              component={Link}
              href="/health-logs"
              startIcon={<ArrowBack />}
            >
              Back to Health Logs
            </Button>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, ml: 2 }}>
              Edit Health Log
            </Typography>
          </Toolbar>
        </AppBar>
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        </Container>
      </Box>
    );
  }

  if (fetchError) {
    return (
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <Button
              color="inherit"
              component={Link}
              href="/health-logs"
              startIcon={<ArrowBack />}
            >
              Back to Health Logs
            </Button>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, ml: 2 }}>
              Edit Health Log
            </Typography>
          </Toolbar>
        </AppBar>
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
          <Alert severity="error">
            {fetchError}
          </Alert>
          <Box mt={2}>
            <Button
              variant="contained"
              component={Link}
              href="/health-logs"
            >
              Return to Health Logs
            </Button>
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Button
            color="inherit"
            component={Link}
            href="/health-logs"
            startIcon={<ArrowBack />}
          >
            Back to Health Logs
          </Button>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, ml: 2 }}>
            Edit Health Log
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Health log updated successfully! Redirecting...
          </Alert>
        )}

        <Card>
          <CardContent>
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Autocomplete
                    freeSolo
                    options={autocompleteData.incident_ids.map(i => i.incident_id)}
                    value={formData.incident_id}
                    onChange={(_, newValue) => setFormData({ ...formData, incident_id: newValue || '' })}
                    onInputChange={(_, newInputValue) => setFormData({ ...formData, incident_id: newInputValue })}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        required
                        label="Incident ID"
                        placeholder="Select or enter an incident ID"
                        helperText="Link this log to a health incident"
                      />
                    )}
                    renderOption={(props, option) => {
                      const incident = autocompleteData.incident_ids.find(i => i.incident_id === option);
                      return (
                        <li {...props}>
                          <Box>
                            <Typography variant="body2">{option}</Typography>
                            {incident && (
                              <Typography variant="caption" color="text.secondary">
                                {incident.status}
                              </Typography>
                            )}
                          </Box>
                        </li>
                      );
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Log Type</InputLabel>
                    <Select
                      value={formData.issue_type}
                      label="Log Type"
                      onChange={(e) => setFormData({ ...formData, issue_type: e.target.value as 'update' | 'doctor_visit_notes' })}
                    >
                      <MenuItem value="update">Update</MenuItem>
                      <MenuItem value="doctor_visit_notes">Doctor Visit Notes</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    type="datetime-local"
                    label="Timestamp"
                    value={formData.timestamp}
                    onChange={(e) => setFormData({ ...formData, timestamp: e.target.value })}
                    slotProps={{
                      inputLabel: { shrink: true }
                    }}
                    helperText="When did this occur?"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    multiline
                    rows={6}
                    label="Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what happened, observations, doctor notes, etc..."
                  />
                </Grid>

                <Grid item xs={12}>
                  <Box display="flex" justifyContent="flex-end" gap={2}>
                    <Button
                      variant="outlined"
                      component={Link}
                      href="/health-logs"
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={<Save />}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Update Health Log'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
