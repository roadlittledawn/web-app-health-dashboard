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

export default function AddHealthLogPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [autocompleteData, setAutocompleteData] = useState<AutocompleteData>({
    incident_ids: [],
  });

  const [formData, setFormData] = useState({
    incident_id: '',
    issue_type: 'update' as 'update' | 'doctor_visit_notes',
    description: '',
    timestamp: formatForDateTimeLocal(new Date()),
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
        router.push('/incidents');
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
            href="/incidents"
            startIcon={<ArrowBack />}
          >
            Back to Incidents
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
                    disabled={loading}
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
                      href="/incidents"
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
