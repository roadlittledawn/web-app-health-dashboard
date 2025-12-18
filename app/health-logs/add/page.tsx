'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AppBar,
  Autocomplete,
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
  TextField,
  Toolbar,
  Typography,
  Alert,
  Slider,
  OutlinedInput,
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

export default function AddHealthLogPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

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

  // Fetch autocomplete data on mount
  useEffect(() => {
    const fetchAutocompleteData = async () => {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const response = await fetch('/api/health-logs-autocomplete', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setAutocompleteData(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch autocomplete data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAutocompleteData();
  }, [router]);

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
      const response = await fetch('/api/health-logs-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          timestamp: new Date(formData.timestamp).toISOString(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to create health log');
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
            Add Health Log
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
            Health log created successfully! Redirecting...
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
                    disabled={loading}
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
                    disabled={loading}
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
                    disabled={loading}
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
                    disabled={loading}
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
                    disabled={loading}
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
                    disabled={loading}
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
                      {saving ? 'Saving...' : 'Save Health Log'}
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
