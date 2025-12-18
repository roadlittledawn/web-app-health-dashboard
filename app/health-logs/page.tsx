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
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Toolbar,
  Typography,
  CircularProgress,
  Alert,
  Pagination,
} from '@mui/material';
import {
  LocalHospital,
  Add,
  FilterList,
  ArrowBack,
  Edit,
} from '@mui/icons-material';
import { HealthLog } from '@/types/health';

export default function HealthLogsPage() {
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    issue_type: '',
    body_area: '',
    start_date: '',
    end_date: '',
  });
  const router = useRouter();

  const logsPerPage = 20;

  useEffect(() => {
    fetchLogs();
  }, [page, filters]);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');

    const token = localStorage.getItem('auth-token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const params = new URLSearchParams({
        limit: logsPerPage.toString(),
        skip: ((page - 1) * logsPerPage).toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== '')
        ),
      });

      const response = await fetch(`/api/health-logs-query?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch health logs');
      }

      const data = await response.json();
      setLogs(data.data);
      setTotal(data.pagination.total);
    } catch (err) {
      setError('Failed to load health logs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'error';
      case 'improving':
        return 'warning';
      case 'resolved':
        return 'success';
      default:
        return 'default';
    }
  };

  const getPainLevelColor = (level: number) => {
    if (level >= 8) return '#EF4444'; // Red
    if (level >= 5) return '#F59E0B'; // Amber
    return '#10B981'; // Green
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
            Health Logs
          </Typography>
          <Button
            color="inherit"
            component={Link}
            href="/health-logs/add"
            startIcon={<Add />}
          >
            Add Log
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
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status}
                    label="Status"
                    onChange={(e) => {
                      setFilters({ ...filters, status: e.target.value });
                      setPage(1);
                    }}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="improving">Improving</MenuItem>
                    <MenuItem value="resolved">Resolved</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Issue Type"
                  value={filters.issue_type}
                  onChange={(e) => {
                    setFilters({ ...filters, issue_type: e.target.value });
                    setPage(1);
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Body Area"
                  value={filters.body_area}
                  onChange={(e) => {
                    setFilters({ ...filters, body_area: e.target.value });
                    setPage(1);
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => {
                    setFilters({
                      status: '',
                      issue_type: '',
                      body_area: '',
                      start_date: '',
                      end_date: '',
                    });
                    setPage(1);
                  }}
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

        {/* Logs List */}
        {!loading && logs.length === 0 && (
          <Alert severity="info">
            No health logs found. Click "Add Log" to create one.
          </Alert>
        )}

        {!loading && logs.length > 0 && (
          <>
            <Grid container spacing={2}>
              {logs.map((log) => (
                <Grid item xs={12} key={log._id?.toString()}>
                  <Card>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="start">
                        <Box flexGrow={1}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Chip
                              label={log.status.toUpperCase()}
                              color={getStatusColor(log.status) as any}
                              size="small"
                            />
                            <Chip
                              label={`Pain: ${log.pain_level}/10`}
                              size="small"
                              sx={{
                                bgcolor: getPainLevelColor(log.pain_level),
                                color: 'white',
                              }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {new Date(log.timestamp).toLocaleDateString()}
                            </Typography>
                          </Box>
                          <Typography variant="h6" gutterBottom>
                            {log.issue_type.replace(/_/g, ' ').toUpperCase()} - {log.body_area}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" paragraph>
                            {log.description}
                          </Typography>
                          {log.symptoms.length > 0 && (
                            <Box mb={1}>
                              <Typography variant="caption" color="text.secondary">
                                Symptoms:
                              </Typography>
                              {log.symptoms.map((symptom, idx) => (
                                <Chip
                                  key={idx}
                                  label={symptom}
                                  size="small"
                                  sx={{ ml: 0.5 }}
                                />
                              ))}
                            </Box>
                          )}
                          <Typography variant="caption" color="text.secondary">
                            Incident ID: {log.incident_id}
                          </Typography>
                        </Box>
                        <Box>
                          <IconButton
                            component={Link}
                            href={`/health-logs/edit/${log._id?.toString()}`}
                            color="primary"
                            aria-label="edit"
                            title="Edit health log"
                          >
                            <Edit />
                          </IconButton>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Pagination */}
            <Box display="flex" justifyContent="center" mt={4}>
              <Pagination
                count={Math.ceil(total / logsPerPage)}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
              />
            </Box>
          </>
        )}
      </Container>
    </Box>
  );
}
