"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  AppBar,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  IconButton,
  TextField,
  Toolbar,
  Typography,
  Alert,
  Slider,
  Divider,
  InputAdornment,
  FormGroup,
  FormControlLabel,
  Checkbox,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import { ArrowBack, Save, Clear } from "@mui/icons-material";
import { formatForDateTimeLocal } from "@/lib/dateUtils";
import { HealthIncident } from "@/types/health";
import {
  PAIN_QUALITY_OPTIONS,
  OTHER_SYMPTOMS_OPTIONS,
  SENSATIONS_OPTIONS,
  WHEN_MOST_SEVERE_OPTIONS,
  WHAT_MAKES_WORSE_OPTIONS,
  WHAT_MAKES_BETTER_OPTIONS,
  TREATMENTS_TRIED_OPTIONS,
  STUDIES_COMPLETED_OPTIONS,
  STATUS_OPTIONS,
  formatOptionLabel,
  toggleArrayItem,
} from "@/lib/healthIncidentOptions";

interface AutocompleteData {
  body_areas: string[];
  injury_sources: string[];
}

export default function EditIncidentPage() {
  const router = useRouter();
  const params = useParams();
  const incidentId = params.id as string;

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [autocompleteData, setAutocompleteData] = useState<AutocompleteData>({
    body_areas: [],
    injury_sources: [],
  });

  const [formData, setFormData] = useState({
    painLocations: [] as string[],
    painIntensity: 5,
    dateStarted: formatForDateTimeLocal(new Date()),
    endDate: "",
    injurySource: "",
    description: "",
    symptoms: {
      painQuality: [] as string[],
      otherSymptoms: [] as string[],
      sensations: [] as string[],
      timing: {
        whenMostSevere: [] as string[],
        whatMakesWorse: [] as string[],
        whatMakesBetter: [] as string[],
      },
    },
    treatments: {
      priorPhysician: [] as string[],
      priorSurgery: [] as string[],
      treatmentsTried: [] as string[],
      studiesCompleted: [] as string[],
    },
    status: ["constant"],
  });

  // Fetch autocomplete data and incident data on mount
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("auth-token");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        // Fetch autocomplete data
        const autocompleteResponse = await fetch("/api/health-logs-autocomplete", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (autocompleteResponse.ok) {
          const data = await autocompleteResponse.json();
          setAutocompleteData({
            body_areas: data.data.body_areas || [],
            injury_sources: data.data.injury_sources || [],
          });
        }

        // Fetch incident data
        const incidentResponse = await fetch(`/api/incidents-query?_id=${incidentId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!incidentResponse.ok) {
          throw new Error("Failed to fetch incident");
        }

        const incidentData = await incidentResponse.json();
        const incident: HealthIncident = incidentData.data[0];

        if (incident) {
          setFormData({
            painLocations: incident.painLocations || [],
            painIntensity: incident.painIntensity || 5,
            dateStarted: formatForDateTimeLocal(new Date(incident.dateStarted)),
            endDate: incident.endDate ? formatForDateTimeLocal(new Date(incident.endDate)) : "",
            injurySource: incident.injurySource || "",
            description: incident.description || "",
            symptoms: {
              painQuality: incident.symptoms?.painQuality || [],
              otherSymptoms: incident.symptoms?.otherSymptoms || [],
              sensations: incident.symptoms?.sensations || [],
              timing: {
                whenMostSevere: incident.symptoms?.timing?.whenMostSevere || [],
                whatMakesWorse: incident.symptoms?.timing?.whatMakesWorse || [],
                whatMakesBetter: incident.symptoms?.timing?.whatMakesBetter || [],
              },
            },
            treatments: {
              priorPhysician: incident.treatments?.priorPhysician || [],
              priorSurgery: incident.treatments?.priorSurgery || [],
              treatmentsTried: incident.treatments?.treatmentsTried || [],
              studiesCompleted: incident.treatments?.studiesCompleted || [],
            },
            status: incident.status || ["constant"],
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load incident");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [incidentId, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    const token = localStorage.getItem("auth-token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const response = await fetch("/api/incidents-update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: incidentId,
          updates: {
            ...formData,
            dateStarted: new Date(formData.dateStarted).toISOString(),
            endDate: formData.endDate
              ? new Date(formData.endDate).toISOString()
              : null,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "Failed to update incident");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/incidents");
      }, 1500);
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
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
            Edit Health Incident
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
                    onChange={(e) =>
                      setFormData({ ...formData, dateStarted: e.target.value })
                    }
                    slotProps={{
                      inputLabel: { shrink: true },
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type={formData.endDate ? "datetime-local" : "text"}
                    label="End Date (Optional)"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    onFocus={() => {
                      if (!formData.endDate) {
                        setFormData({
                          ...formData,
                          endDate: formatForDateTimeLocal(new Date()),
                        });
                      }
                    }}
                    placeholder="Click to set end date"
                    slotProps={{
                      input: {
                        endAdornment: formData.endDate ? (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() =>
                                setFormData({ ...formData, endDate: "" })
                              }
                              edge="end"
                              size="small"
                              title="Clear end date"
                            >
                              <Clear />
                            </IconButton>
                          </InputAdornment>
                        ) : null,
                      },
                    }}
                    helperText="Fill in when incident resolves (leave empty for ongoing)"
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography gutterBottom>
                    Pain Intensity: {formData.painIntensity}/10
                  </Typography>
                  <Slider
                    value={formData.painIntensity}
                    onChange={(_, value) =>
                      setFormData({
                        ...formData,
                        painIntensity: value as number,
                      })
                    }
                    min={0}
                    max={10}
                    marks
                    valueLabelDisplay="auto"
                    color={
                      formData.painIntensity >= 8
                        ? "error"
                        : formData.painIntensity >= 5
                        ? "warning"
                        : "success"
                    }
                  />
                </Grid>

                <Grid item xs={12}>
                  <Autocomplete
                    freeSolo
                    options={autocompleteData.injury_sources}
                    value={formData.injurySource}
                    onChange={(_, newValue) =>
                      setFormData({ ...formData, injurySource: newValue || "" })
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Injury Source"
                        placeholder="How did this injury occur?"
                        helperText="Select from existing or type new"
                        onChange={(e) =>
                          setFormData({ ...formData, injurySource: e.target.value })
                        }
                      />
                    )}
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
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
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
                    {PAIN_QUALITY_OPTIONS.map((option) => (
                      <FormControlLabel
                        key={option}
                        control={
                          <Checkbox
                            checked={formData.symptoms.painQuality.includes(option)}
                            onChange={() =>
                              setFormData({
                                ...formData,
                                symptoms: {
                                  ...formData.symptoms,
                                  painQuality: toggleArrayItem(
                                    formData.symptoms.painQuality,
                                    option
                                  ),
                                },
                              })
                            }
                          />
                        }
                        label={formatOptionLabel(option)}
                      />
                    ))}
                  </FormGroup>
                </Grid>

                {/* Other Symptoms */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Other Symptoms
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <FormGroup row>
                    {OTHER_SYMPTOMS_OPTIONS.map((option) => (
                      <FormControlLabel
                        key={option}
                        control={
                          <Checkbox
                            checked={formData.symptoms.otherSymptoms.includes(option)}
                            onChange={() =>
                              setFormData({
                                ...formData,
                                symptoms: {
                                  ...formData.symptoms,
                                  otherSymptoms: toggleArrayItem(
                                    formData.symptoms.otherSymptoms,
                                    option
                                  ),
                                },
                              })
                            }
                          />
                        }
                        label={formatOptionLabel(option)}
                      />
                    ))}
                  </FormGroup>
                </Grid>

                {/* Sensations */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Physical Sensations
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <FormGroup row>
                    {SENSATIONS_OPTIONS.map((option) => (
                      <FormControlLabel
                        key={option}
                        control={
                          <Checkbox
                            checked={formData.symptoms.sensations.includes(option)}
                            onChange={() =>
                              setFormData({
                                ...formData,
                                symptoms: {
                                  ...formData.symptoms,
                                  sensations: toggleArrayItem(
                                    formData.symptoms.sensations,
                                    option
                                  ),
                                },
                              })
                            }
                          />
                        }
                        label={formatOptionLabel(option)}
                      />
                    ))}
                  </FormGroup>
                </Grid>

                {/* Timing */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Timing
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    When Most Severe
                  </Typography>
                  <FormGroup row>
                    {WHEN_MOST_SEVERE_OPTIONS.map((option) => (
                      <FormControlLabel
                        key={option}
                        control={
                          <Checkbox
                            checked={formData.symptoms.timing.whenMostSevere.includes(
                              option
                            )}
                            onChange={() =>
                              setFormData({
                                ...formData,
                                symptoms: {
                                  ...formData.symptoms,
                                  timing: {
                                    ...formData.symptoms.timing,
                                    whenMostSevere: toggleArrayItem(
                                      formData.symptoms.timing.whenMostSevere,
                                      option
                                    ),
                                  },
                                },
                              })
                            }
                          />
                        }
                        label={formatOptionLabel(option)}
                      />
                    ))}
                  </FormGroup>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    What Makes Worse
                  </Typography>
                  <FormGroup row>
                    {WHAT_MAKES_WORSE_OPTIONS.map((option) => (
                      <FormControlLabel
                        key={option}
                        control={
                          <Checkbox
                            checked={formData.symptoms.timing.whatMakesWorse.includes(
                              option
                            )}
                            onChange={() =>
                              setFormData({
                                ...formData,
                                symptoms: {
                                  ...formData.symptoms,
                                  timing: {
                                    ...formData.symptoms.timing,
                                    whatMakesWorse: toggleArrayItem(
                                      formData.symptoms.timing.whatMakesWorse,
                                      option
                                    ),
                                  },
                                },
                              })
                            }
                          />
                        }
                        label={formatOptionLabel(option)}
                      />
                    ))}
                  </FormGroup>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    What Makes Better
                  </Typography>
                  <FormGroup row>
                    {WHAT_MAKES_BETTER_OPTIONS.map((option) => (
                      <FormControlLabel
                        key={option}
                        control={
                          <Checkbox
                            checked={formData.symptoms.timing.whatMakesBetter.includes(
                              option
                            )}
                            onChange={() =>
                              setFormData({
                                ...formData,
                                symptoms: {
                                  ...formData.symptoms,
                                  timing: {
                                    ...formData.symptoms.timing,
                                    whatMakesBetter: toggleArrayItem(
                                      formData.symptoms.timing.whatMakesBetter,
                                      option
                                    ),
                                  },
                                },
                              })
                            }
                          />
                        }
                        label={formatOptionLabel(option)}
                      />
                    ))}
                  </FormGroup>
                </Grid>

                {/* Treatments */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Treatments
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Treatments Tried
                  </Typography>
                  <FormGroup row>
                    {TREATMENTS_TRIED_OPTIONS.map((option) => (
                      <FormControlLabel
                        key={option}
                        control={
                          <Checkbox
                            checked={formData.treatments.treatmentsTried.includes(
                              option
                            )}
                            onChange={() =>
                              setFormData({
                                ...formData,
                                treatments: {
                                  ...formData.treatments,
                                  treatmentsTried: toggleArrayItem(
                                    formData.treatments.treatmentsTried,
                                    option
                                  ),
                                },
                              })
                            }
                          />
                        }
                        label={formatOptionLabel(option)}
                      />
                    ))}
                  </FormGroup>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Studies Completed
                  </Typography>
                  <FormGroup row>
                    {STUDIES_COMPLETED_OPTIONS.map((option) => (
                      <FormControlLabel
                        key={option}
                        control={
                          <Checkbox
                            checked={formData.treatments.studiesCompleted.includes(
                              option
                            )}
                            onChange={() =>
                              setFormData({
                                ...formData,
                                treatments: {
                                  ...formData.treatments,
                                  studiesCompleted: toggleArrayItem(
                                    formData.treatments.studiesCompleted,
                                    option
                                  ),
                                },
                              })
                            }
                          />
                        }
                        label={formatOptionLabel(option)}
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
                  <TextField
                    select
                    fullWidth
                    label="Status"
                    value={formData.status[0] || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: [e.target.value],
                      })
                    }
                    helperText="Select the current status of this incident"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <MenuItem key={option} value={option}>
                        {formatOptionLabel(option)}
                      </MenuItem>
                    ))}
                  </TextField>
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
                      {saving ? "Saving..." : "Update Incident"}
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
