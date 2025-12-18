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

interface IncidentOption {
  incident_id: string;
  issue_type: string;
  last_log: Date;
  status: string;
}

interface AutocompleteData {
  issue_types: string[];
  body_areas: string[];
  symptoms: string[];
  triggers: string[];
  activities: string[];
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
    issue_types: [],
    body_areas: [],
    symptoms: [],
    triggers: [],
    activities: [],
    incident_ids: [],
  });

  const [formData, setFormData] = useState({
    issue_type: '',
    pain_level: 5,
    description: '',
    incident_id: '',
    body_area: '',
    status: 'active',
    timestamp: new Date().toISOString().slice(0, 16),
    activities: [] as string[],
    triggers: [] as string[],
    symptoms: [] as string[],
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
      if (!logId || !/^[a-f\d]{24}$/i.test(logId)) {
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
        const logResponse = await fetch(`/api/health-logs-query?_id=${logId}`, {
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
            issue_type: log.issue_type || '',
            pain_level: log.pain_level || 5,
            description: log.description || '',
            incident_id: log.incident_id || '',
            body_area: log.body_area || '',
            status: log.status || 'active',
            timestamp: log.timestamp ? new Date(log.timestamp).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
            activities: log.activities || [],
            triggers: log.triggers || [],
            symptoms: log.symptoms || [],
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
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    freeSolo
                    options={autocompleteData.issue_types}
                    value={formData.issue_type}
                    onChange={(_, newValue) => setFormData({ ...formData, issue_type: newValue || '' })}
                    onInputChange={(_, newInputValue) => setFormData({ ...formData, issue_type: newInputValue })}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        required
                        label="Issue Type"
                        placeholder="e.g., back_pain, knee_pain"
                        helperText="Use underscores for multi-word types"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    freeSolo
                    options={autocompleteData.body_areas}
                    value={formData.body_area}
                    onChange={(_, newValue) => setFormData({ ...formData, body_area: newValue || '' })}
                    onInputChange={(_, newInputValue) => setFormData({ ...formData, body_area: newInputValue })}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        required
                        label="Body Area"
                        placeholder="e.g., lower back, right knee"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
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
                        placeholder="e.g., back_2024_12_001"
                        helperText="Groups related logs together"
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
                                {incident.issue_type} - {incident.status}
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
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={formData.status}
                      label="Status"
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="improving">Improving</MenuItem>
                      <MenuItem value="resolved">Resolved</MenuItem>
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
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography gutterBottom>
                    Pain Level: {formData.pain_level}/10
                  </Typography>
                  <Slider
                    value={formData.pain_level}
                    onChange={(_, value) => setFormData({ ...formData, pain_level: value as number })}
                    min={1}
                    max={10}
                    marks
                    valueLabelDisplay="auto"
                    color={formData.pain_level >= 8 ? 'error' : formData.pain_level >= 5 ? 'warning' : 'success'}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    multiline
                    rows={4}
                    label="Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the health issue in detail..."
                  />
                </Grid>

                {/* Symptoms */}
                <Grid item xs={12}>
                  <Autocomplete
                    multiple
                    freeSolo
                    options={autocompleteData.symptoms}
                    value={formData.symptoms}
                    onChange={(_, newValue) => {
                      setFormData({ ...formData, symptoms: newValue });
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Symptoms"
                        placeholder="Type and press Enter to add"
                      />
                    )}
                  />
                </Grid>

                {/* Activities */}
                <Grid item xs={12}>
                  <Autocomplete
                    multiple
                    freeSolo
                    options={autocompleteData.activities}
                    value={formData.activities}
                    onChange={(_, newValue) => {
                      setFormData({ ...formData, activities: newValue });
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Activities Before/During"
                        placeholder="Type and press Enter to add"
                      />
                    )}
                  />
                </Grid>

                {/* Triggers */}
                <Grid item xs={12}>
                  <Autocomplete
                    multiple
                    freeSolo
                    options={autocompleteData.triggers}
                    value={formData.triggers}
                    onChange={(_, newValue) => {
                      setFormData({ ...formData, triggers: newValue });
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Potential Triggers"
                        placeholder="Type and press Enter to add"
                      />
                    )}
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
