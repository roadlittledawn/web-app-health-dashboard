"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import MarkdownContent from "@/components/MarkdownContent";
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
} from "@mui/material";
import { ArrowBack, Edit } from "@mui/icons-material";
import { HealthIncident, HealthLog } from "@/types/health";
import { formatLocalDateTime } from "@/lib/dateUtils";
import { formatOptionLabel } from "@/lib/healthIncidentOptions";
import HealthLogForm from "@/components/HealthLogForm";
import HealthLogEdit from "@/components/HealthLogEdit";
import PainLevelChart from "@/components/PainLevelChart";
import PainLevelForm from "@/components/PainLevelForm";
import Link from "next/link";

export default function IncidentDetailPage() {
  const [incident, setIncident] = useState<HealthIncident | null>(null);
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
      const token = localStorage.getItem("auth-token");

      // Fetch incident details
      const incidentResponse = await fetch(
        `/api/incidents-query?_id=${incidentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!incidentResponse.ok) throw new Error("Failed to fetch incident");
      const incidentData = await incidentResponse.json();
      setIncident(incidentData.data[0]);

      // Fetch associated logs
      const logsResponse = await fetch(
        `/api/health-logs-query?incident_id=${incidentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!logsResponse.ok) throw new Error("Failed to fetch logs");
      const logsData = await logsResponse.json();
      // Sort logs by timestamp (or created_at if no timestamp) in descending order
      const sortedLogs = logsData.data.sort(
        (a: HealthLog, b: HealthLog) =>
          new Date(b.timestamp || b.created_at).getTime() -
          new Date(a.timestamp || a.created_at).getTime()
      );
      setLogs(sortedLogs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!incident) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Incident not found</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <AppBar position="static" sx={{ mb: 3 }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => router.push("/incidents")}
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {incident.incidentId ||
              incident.painLocations?.join(", ") ||
              "Incident Details"}
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

      <Container maxWidth="lg" sx={{ mt: 3, mb: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={2}
                >
                  <Box>
                    <Typography variant="h2" gutterBottom>
                      {incident.incidentId ||
                        incident.painLocations?.join(", ") ||
                        "No location specified"}
                    </Typography>
                    <Box display="flex" gap={0.5} flexWrap="wrap">
                      {(incident.painLocations || []).map((location, idx) => (
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
                    label={
                      incident.status.includes("resolved")
                        ? "resolved"
                        : incident.status.includes("improving")
                        ? "improving"
                        : "active"
                    }
                    color={
                      incident.status.includes("resolved")
                        ? "success"
                        : "warning"
                    }
                  />
                </Box>

                <MarkdownContent variant="body1" sx={{ mb: 2 }}>
                  {incident.description}
                </MarkdownContent>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">Date Started</Typography>
                    <Typography variant="body2">
                      {formatLocalDateTime(incident.dateStarted)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">Pain Intensity</Typography>
                    <Typography variant="body2">
                      {incident.painIntensity}/10
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" mb={2}>
                  Pain Levels Over Time
                </Typography>
                <PainLevelChart data={incident.painIntensityOverTime || []} />
                <Box mt={2}>
                  <PainLevelForm
                    incidentId={incidentId}
                    painLevels={incident.painIntensityOverTime || []}
                    onUpdate={fetchIncidentData}
                  />
                </Box>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" mb={2}>
                  Log Entries
                </Typography>
                <HealthLogForm
                  incidentId={incidentId}
                  onSuccess={fetchIncidentData}
                />

                {logs.length === 0 ? (
                  <Typography color="text.secondary" sx={{ mt: 2 }}>
                    No log entries yet
                  </Typography>
                ) : (
                  <List sx={{ mt: 2 }}>
                    {logs.map((log, index) => (
                      <div key={log._id?.toString()}>
                        <ListItem>
                          <ListItemText
                            primary={
                              <HealthLogEdit
                                log={log}
                                incidentId={incidentId}
                                onSuccess={fetchIncidentData}
                              />
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
            {/* Symptoms Card */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Symptoms
                </Typography>

                <Box mb={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Pain Quality
                  </Typography>
                  <Box display="flex" gap={0.5} flexWrap="wrap">
                    {incident.symptoms?.painQuality?.length ? (
                      incident.symptoms.painQuality.map((item, idx) => (
                        <Chip
                          key={idx}
                          label={formatOptionLabel(item)}
                          size="small"
                        />
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        None specified
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Box mb={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Other Symptoms
                  </Typography>
                  <Box display="flex" gap={0.5} flexWrap="wrap">
                    {incident.symptoms?.otherSymptoms?.length ? (
                      incident.symptoms.otherSymptoms.map((item, idx) => (
                        <Chip
                          key={idx}
                          label={formatOptionLabel(item)}
                          size="small"
                        />
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        None specified
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Box mb={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Sensations
                  </Typography>
                  <Box display="flex" gap={0.5} flexWrap="wrap">
                    {incident.symptoms?.sensations?.length ? (
                      incident.symptoms.sensations.map((item, idx) => (
                        <Chip
                          key={idx}
                          label={formatOptionLabel(item)}
                          size="small"
                        />
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        None specified
                      </Typography>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Timing Card */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Timing
                </Typography>

                <Box mb={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    When Most Severe
                  </Typography>
                  <Box display="flex" gap={0.5} flexWrap="wrap">
                    {incident.symptoms?.timing?.whenMostSevere?.length ? (
                      incident.symptoms.timing.whenMostSevere.map(
                        (item, idx) => (
                          <Chip
                            key={idx}
                            label={formatOptionLabel(item)}
                            size="small"
                          />
                        )
                      )
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        None specified
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Box mb={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    What Makes Worse
                  </Typography>
                  <Box display="flex" gap={0.5} flexWrap="wrap">
                    {incident.symptoms?.timing?.whatMakesWorse?.length ? (
                      incident.symptoms.timing.whatMakesWorse.map(
                        (item, idx) => (
                          <Chip
                            key={idx}
                            label={formatOptionLabel(item)}
                            size="small"
                          />
                        )
                      )
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        None specified
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Box mb={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    What Makes Better
                  </Typography>
                  <Box display="flex" gap={0.5} flexWrap="wrap">
                    {incident.symptoms?.timing?.whatMakesBetter?.length ? (
                      incident.symptoms.timing.whatMakesBetter.map(
                        (item, idx) => (
                          <Chip
                            key={idx}
                            label={formatOptionLabel(item)}
                            size="small"
                          />
                        )
                      )
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        None specified
                      </Typography>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Treatments Card */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Treatments
                </Typography>

                <Box mb={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Treatments Tried
                  </Typography>
                  <Box display="flex" gap={0.5} flexWrap="wrap">
                    {incident.treatments?.treatmentsTried?.length ? (
                      incident.treatments.treatmentsTried.map((item, idx) => (
                        <Chip
                          key={idx}
                          label={formatOptionLabel(item)}
                          size="small"
                        />
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        None specified
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Box mb={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Studies Completed
                  </Typography>
                  <Box display="flex" gap={0.5} flexWrap="wrap">
                    {incident.treatments?.studiesCompleted?.length ? (
                      incident.treatments.studiesCompleted.map((item, idx) => (
                        <Chip
                          key={idx}
                          label={formatOptionLabel(item)}
                          size="small"
                        />
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        None specified
                      </Typography>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Status Card */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Status
                </Typography>
                <Box display="flex" gap={0.5} flexWrap="wrap">
                  {incident.status?.length ? (
                    incident.status.map((item, idx) => (
                      <Chip
                        key={idx}
                        label={formatOptionLabel(item)}
                        size="small"
                        color={
                          item === "resolved"
                            ? "success"
                            : item === "improving"
                            ? "info"
                            : "default"
                        }
                      />
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      None specified
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
