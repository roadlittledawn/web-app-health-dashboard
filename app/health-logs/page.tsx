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
import { formatLocalDateTime } from '@/lib/dateUtils';

export default function HealthLogsPage() {
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    incident_id: '',
    issue_type: '',
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
      // Sort logs by timestamp in descending order (most recent first)
      const sortedLogs = data.data.sort((a: HealthLog, b: HealthLog) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setLogs(sortedLogs);
      setTotal(data.pagination.total);
    } catch (err) {
      setError('Failed to load health logs');
      console.error(err);
    } finally {
      setLoading(false);
    }
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
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Incident ID"
                  value={filters.incident_id}
                  onChange={(e) => {
                    setFilters({ ...filters, incident_id: e.target.value });
                    setPage(1);
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Log Type</InputLabel>
                  <Select
                    value={filters.issue_type}
                    label="Log Type"
                    onChange={(e) => {
                      setFilters({ ...filters, issue_type: e.target.value });
                      setPage(1);
                    }}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="update">Update</MenuItem>
                    <MenuItem value="doctor_visit_notes">Doctor Visit Notes</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => {
                    setFilters({
                      incident_id: '',
                      issue_type: '',
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
                              label={log.issue_type.replace(/_/g, ' ').toUpperCase()}
                              color="primary"
                              size="small"
                              variant="outlined"
                            />
                            {log.timestamp && (
                              <Typography variant="caption" color="text.secondary">
                                {formatLocalDateTime(log.timestamp)}
                              </Typography>
                            )}
                          </Box>
                          <Typography variant="body1" paragraph>
                            {log.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Incident ID: {log.incident_id?.toString()}
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
