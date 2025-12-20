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
  Grid,
  TextField,
  Toolbar,
  Typography,
  Alert,
  Slider,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack,
  Save,
} from '@mui/icons-material';
import { formatForDateTimeLocal } from '@/lib/dateUtils';
import { HealthIncident } from '@/types/health';

interface AutocompleteData {
  body_areas: string[];
}

export default function EditIncidentPage() {
  const router = useRouter();
  const params = useParams();
  const incidentId = params.id as string;

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [autocompleteData, setAutocompleteData] = useState<AutocompleteData>({
    body_areas: [],
  });

  const [formData, setFormData] = useState({
    painLocations: [] as string[],
    painIntensity: 5,
    dateStarted: formatForDateTimeLocal(new Date()),
    endDate: '',
    injurySource: '',
    description: '',
    symptoms: {
      painQuality: {
        sharp: false,
        dull: false,
        throbbing: false,
        stabbing: false,
        aching: false,
        heavy: false,
        burning: false,
        other: '',
      },
      otherSymptoms: {
        stiffness: false,
        instability: false,
        catching: false,
        popping: false,
        locking: false,
        other: '',
      },
      sensations: {
        bruising: false,
        swelling: false,
        numbness: false,
        tingling: false,
        weakness: false,
      },
      timing: {
        whenMostSevere: {
          morning: false,
          afternoon: false,
          evening: false,
          consistentAllDay: false,
          interruptsSleep: false,
          other: '',
        },
        whatMakesWorse: {
          rest: false,
          activity: false,
          sleeping: false,
          kneeling: false,
          other: '',
        },
        whatMakesBetter: {
          rest: false,
          activity: false,
          ice: false,
          medication: false,
          brace: false,
          other: '',
        },
      },
    },
    treatments: {
      priorPhysician: { seen: null, provider: '', when: '' },
      priorSurgery: { had: null, surgery: '', when: '' },
      treatmentsTried: {
        massageTherapy: { tried: false, helpful: null },
        physicalTherapy: { tried: false, helpful: null },
        chiropracticTherapy: { tried: false, helpful: null },
        acupuncture: { tried: false, helpful: null },
        bracing: { tried: false, helpful: null },
        injections: { tried: false, helpful: null },
        medication: { tried: false, helpful: null },
        other: { tried: false, helpful: null, description: '' },
      },
      studiesCompleted: {
        xRays: false,
        mri: false,
        ctScan: false,
        emgNerveStudy: false,
        boneScan: false,
        ultrasound: false,
        other: '',
      },
    },
    status: {
      worsening: false,
      resolved: false,
      improving: false,
      constant: true,
      occasional: false,
    },
  });

  // Fetch existing incident data and autocomplete data on mount
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        router.push('/login');
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
          setAutocompleteData({ body_areas: data.data.body_areas || [] });
        }

        // Fetch existing incident data
        const incidentResponse = await fetch(`/api/incidents-query?_id=${incidentId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!incidentResponse.ok) {
          throw new Error('Failed to fetch incident');
        }

        const incidentData = await incidentResponse.json();
        if (incidentData.data && incidentData.data.length > 0) {
          const incident: HealthIncident = incidentData.data[0];
          setFormData({
            painLocations: incident.painLocations || [],
            painIntensity: incident.painIntensity || 5,
            dateStarted: incident.dateStarted ? formatForDateTimeLocal(incident.dateStarted) : formatForDateTimeLocal(new Date()),
            endDate: incident.endDate ? formatForDateTimeLocal(incident.endDate) : '',
            injurySource: incident.injurySource || '',
            description: incident.description || '',
            symptoms: incident.symptoms || formData.symptoms,
            treatments: incident.treatments || formData.treatments,
            status: incident.status || formData.status,
          });
        } else {
          throw new Error('Incident not found');
        }
      } catch (err: any) {
        console.error('Failed to fetch data:', err);
        setFetchError(err.message || 'Failed to load incident');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, incidentId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await fetch('/api/incidents-update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: incidentId,
          updates: {
            ...formData,
            dateStarted: new Date(formData.dateStarted).toISOString(),
            endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to update incident');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/incidents/${incidentId}`);
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
              href="/incidents"
              startIcon={<ArrowBack />}
            >
              Back to Incidents
            </Button>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, ml: 2 }}>
              Edit Incident
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
              href="/incidents"
              startIcon={<ArrowBack />}
            >
              Back to Incidents
            </Button>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, ml: 2 }}>
              Edit Incident
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
              href="/incidents"
            >
              Return to Incidents
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
            href={`/incidents/${incidentId}`}
            startIcon={<ArrowBack />}
          >
            Back to Incident
          </Button>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, ml: 2 }}>
            Edit Incident
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
            Incident updated successfully! Redirecting...
          </Alert>
        )}

        <Card>
          <CardContent>
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Grid container spacing={3}>
                {/* Basic Information */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Basic Information
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                </Grid>

                <Grid item xs={12}>
                  <Autocomplete
                    multiple
                    freeSolo
                    options={autocompleteData.body_areas}
                    value={formData.painLocations}
                    onChange={(_, newValue) => {
                      setFormData({ ...formData, painLocations: newValue });
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        required
                        label="Pain Locations"
                        placeholder="Type and press Enter to add multiple locations"
                        helperText="Select or type multiple pain locations"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    type="datetime-local"
                    label="Date Started"
                    value={formData.dateStarted}
                    onChange={(e) => setFormData({ ...formData, dateStarted: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="datetime-local"
                    label="End Date (Optional)"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    helperText="Leave empty if incident is ongoing"
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography gutterBottom>
                    Pain Intensity: {formData.painIntensity}/10
                  </Typography>
                  <Slider
                    value={formData.painIntensity}
                    onChange={(_, value) => setFormData({ ...formData, painIntensity: value as number })}
                    min={0}
                    max={10}
                    marks
                    valueLabelDisplay="auto"
                    color={formData.painIntensity >= 8 ? 'error' : formData.painIntensity >= 5 ? 'warning' : 'success'}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Injury Source"
                    value={formData.injurySource}
                    onChange={(e) => setFormData({ ...formData, injurySource: e.target.value })}
                    placeholder="How did this injury occur?"
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
                    placeholder="Describe the incident and symptoms in detail..."
                  />
                </Grid>

                {/* Pain Quality */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Pain Quality
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <FormGroup row>
                    {Object.keys(formData.symptoms.painQuality).filter(key => key !== 'other').map((key) => (
                      <FormControlLabel
                        key={key}
                        control={
                          <Checkbox
                            checked={formData.symptoms.painQuality[key as keyof typeof formData.symptoms.painQuality] as boolean}
                            onChange={(e) => setFormData({
                              ...formData,
                              symptoms: {
                                ...formData.symptoms,
                                painQuality: {
                                  ...formData.symptoms.painQuality,
                                  [key]: e.target.checked,
                                },
                              },
                            })}
                          />
                        }
                        label={key.charAt(0).toUpperCase() + key.slice(1)}
                      />
                    ))}
                  </FormGroup>
                  <TextField
                    fullWidth
                    label="Other Pain Quality"
                    value={formData.symptoms.painQuality.other}
                    onChange={(e) => setFormData({
                      ...formData,
                      symptoms: {
                        ...formData.symptoms,
                        painQuality: { ...formData.symptoms.painQuality, other: e.target.value },
                      },
                    })}
                    sx={{ mt: 2 }}
                  />
                </Grid>

                {/* Other Symptoms */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Other Symptoms
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <FormGroup row>
                    {Object.keys(formData.symptoms.otherSymptoms).filter(key => key !== 'other').map((key) => (
                      <FormControlLabel
                        key={key}
                        control={
                          <Checkbox
                            checked={formData.symptoms.otherSymptoms[key as keyof typeof formData.symptoms.otherSymptoms] as boolean}
                            onChange={(e) => setFormData({
                              ...formData,
                              symptoms: {
                                ...formData.symptoms,
                                otherSymptoms: {
                                  ...formData.symptoms.otherSymptoms,
                                  [key]: e.target.checked,
                                },
                              },
                            })}
                          />
                        }
                        label={key.charAt(0).toUpperCase() + key.slice(1)}
                      />
                    ))}
                  </FormGroup>
                  <TextField
                    fullWidth
                    label="Other Symptoms"
                    value={formData.symptoms.otherSymptoms.other}
                    onChange={(e) => setFormData({
                      ...formData,
                      symptoms: {
                        ...formData.symptoms,
                        otherSymptoms: { ...formData.symptoms.otherSymptoms, other: e.target.value },
                      },
                    })}
                    sx={{ mt: 2 }}
                  />
                </Grid>

                {/* Sensations */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Physical Sensations
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <FormGroup row>
                    {Object.keys(formData.symptoms.sensations).map((key) => (
                      <FormControlLabel
                        key={key}
                        control={
                          <Checkbox
                            checked={formData.symptoms.sensations[key as keyof typeof formData.symptoms.sensations] as boolean}
                            onChange={(e) => setFormData({
                              ...formData,
                              symptoms: {
                                ...formData.symptoms,
                                sensations: {
                                  ...formData.symptoms.sensations,
                                  [key]: e.target.checked,
                                },
                              },
                            })}
                          />
                        }
                        label={key.charAt(0).toUpperCase() + key.slice(1)}
                      />
                    ))}
                  </FormGroup>
                </Grid>

                {/* Current Status */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Current Status
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <FormGroup row>
                    {Object.keys(formData.status).map((key) => (
                      <FormControlLabel
                        key={key}
                        control={
                          <Checkbox
                            checked={formData.status[key as keyof typeof formData.status]}
                            onChange={(e) => setFormData({
                              ...formData,
                              status: {
                                ...formData.status,
                                [key]: e.target.checked,
                              },
                            })}
                          />
                        }
                        label={key.charAt(0).toUpperCase() + key.slice(1)}
                      />
                    ))}
                  </FormGroup>
                </Grid>

                <Grid item xs={12}>
                  <Box display="flex" justifyContent="flex-end" gap={2}>
                    <Button
                      variant="outlined"
                      component={Link}
                      href={`/incidents/${incidentId}`}
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
                      {saving ? 'Saving...' : 'Update Incident'}
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
