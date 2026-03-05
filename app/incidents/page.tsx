"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MarkdownContent from "@/components/MarkdownContent";
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
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Toolbar,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  LocalHospital,
  Add,
  ArrowBack,
  Edit,
  Visibility,
  FilterList,
} from "@mui/icons-material";
import { HealthIncident } from "@/types/health";
import { formatLocalDateTime } from "@/lib/dateUtils";
import { STATUS_OPTIONS, formatOptionLabel } from "@/lib/healthIncidentOptions";

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<HealthIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    status: "",
  });
  const router = useRouter();

  useEffect(() => {
    fetchIncidents();
  }, [filters]);

  const fetchIncidents = async () => {
    setLoading(true);
    setError("");

    const token = localStorage.getItem("auth-token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const response = await fetch("/api/incidents-query", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch incidents");
      }

      const data = await response.json();

      // Apply client-side filtering and sorting
      let filteredIncidents = data.data;
      if (filters.status) {
        filteredIncidents = filteredIncidents.filter(
          (incident: HealthIncident) => {
            return incident.status.includes(filters.status);
          }
        );
      }

      // Sort by dateStarted (most recent first)
      filteredIncidents = filteredIncidents.sort(
        (a: HealthIncident, b: HealthIncident) =>
          new Date(b.dateStarted).getTime() - new Date(a.dateStarted).getTime()
      );

      setIncidents(filteredIncidents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string[]) => {
    if (status.includes("resolved")) return "success";
    if (status.includes("improving")) return "warning";
    if (status.includes("worsening") || status.includes("constant"))
      return "error";
    if (status.includes("occasional")) return "info";
    return "default";
  };

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
          <LocalHospital sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Health Incidents
          </Typography>
          <Button
            color="inherit"
            component={Link}
            href="/incidents/add"
            startIcon={<Add />}
          >
            New Incident
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <FilterList sx={{ mr: 1 }} />
              <Typography variant="h6">Filters</Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status}
                    label="Status"
                    onChange={(e) =>
                      setFilters({ ...filters, status: e.target.value })
                    }
                  >
                    <MenuItem value="">All</MenuItem>
                    {STATUS_OPTIONS.map((status) => (
                      <MenuItem key={status} value={status}>
                        {formatOptionLabel(status)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => setFilters({ status: "" })}
                  sx={{ minWidth: 120 }}
                >
                  Clear Filters
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Loading / Error States */}
        {loading && (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Incidents List */}
        {!loading && incidents.length === 0 && (
          <Alert severity="info">
            No incidents found. Click "New Incident" to create one.
          </Alert>
        )}

        {!loading && incidents.length > 0 && (
          <Grid container spacing={2}>
            {incidents.map((incident) => (
              <Grid item xs={12} key={incident._id?.toString()}>
                <Card>
                  <CardContent>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      mb={2}
                    >
                      <Box>
                        <Typography variant="h3" component="h2" gutterBottom>
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
                      <Box display="flex" gap={0.5} flexWrap="wrap">
                        {incident.status.map((status, idx) => (
                          <Chip
                            key={idx}
                            label={formatOptionLabel(status)}
                            color={getStatusColor(incident.status) as any}
                            size="small"
                          />
                        ))}
                      </Box>
                    </Box>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Started: {formatLocalDateTime(incident.dateStarted)}
                    </Typography>

                    {incident.painIntensity !== null && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Pain Level: {incident.painIntensity}/10
                      </Typography>
                    )}

                    <MarkdownContent variant="body2">
                      {incident.description}
                    </MarkdownContent>

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
        )}
      </Container>
    </Box>
  );
}
