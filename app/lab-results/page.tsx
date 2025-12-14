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
  Grid,
  Toolbar,
  Typography,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import {
  ArrowBack,
  Add,
  Biotech,
  TrendingUp,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function LabResultsPage() {
  const [results, setResults] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [refRanges, setRefRanges] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState(0); // 0 = chart, 1 = list
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');

    const token = localStorage.getItem('auth-token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      // Fetch both list and trends
      const [resultsRes, trendsRes] = await Promise.all([
        fetch('/api/lab-results-query?limit=20', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/lab-results-trends', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      if (!resultsRes.ok || !trendsRes.ok) {
        throw new Error('Failed to fetch lab results');
      }

      const resultsData = await resultsRes.json();
      const trendsData = await trendsRes.json();

      setResults(resultsData.data);
      setTrends(trendsData.data);
      setRefRanges(trendsData.referenceRanges);
    } catch (err) {
      setError('Failed to load lab results');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getFlagColor = (flag?: string) => {
    switch (flag) {
      case 'high':
      case 'low':
        return 'error';
      case 'normal':
        return 'success';
      default:
        return 'default';
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
          <Biotech sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Lab Results
          </Typography>
          <Button
            color="inherit"
            component={Link}
            href="/lab-results/add"
            startIcon={<Add />}
          >
            Add Result
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Tabs value={view} onChange={(_, v) => setView(v)} sx={{ mb: 3 }}>
          <Tab icon={<TrendingUp />} label="Trends" />
          <Tab icon={<Biotech />} label="All Results" />
        </Tabs>

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

        {/* Trends View */}
        {!loading && view === 0 && (
          <>
            {trends.length === 0 ? (
              <Alert severity="info">
                No lab results yet. Click "Add Result" to enter your first lab data.
              </Alert>
            ) : (
              <Grid container spacing={3}>
                {/* Total Cholesterol Chart */}
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Total Cholesterol Over Time
                      </Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={trends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="dateLabel" />
                          <YAxis label={{ value: 'mg/dL', angle: -90, position: 'insideLeft' }} />
                          <Tooltip />
                          <Legend />
                          {refRanges?.total_cholesterol && (
                            <>
                              <ReferenceLine y={refRanges.total_cholesterol.max} stroke="red" strokeDasharray="3 3" label="High" />
                              <ReferenceLine y={refRanges.total_cholesterol.min} stroke="orange" strokeDasharray="3 3" label="Low" />
                            </>
                          )}
                          <Line type="monotone" dataKey="total_cholesterol" stroke="#8884d8" strokeWidth={2} name="Total Cholesterol" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>

                {/* LDL Cholesterol Chart */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        LDL Cholesterol
                      </Typography>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={trends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="dateLabel" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          {refRanges?.ldl && (
                            <ReferenceLine y={refRanges.ldl.max} stroke="red" strokeDasharray="3 3" />
                          )}
                          <Line type="monotone" dataKey="ldl" stroke="#82ca9d" strokeWidth={2} name="LDL" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>

                {/* HDL Cholesterol Chart */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        HDL Cholesterol
                      </Typography>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={trends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="dateLabel" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          {refRanges?.hdl && (
                            <ReferenceLine y={refRanges.hdl.min} stroke="orange" strokeDasharray="3 3" />
                          )}
                          <Line type="monotone" dataKey="hdl" stroke="#ffc658" strokeWidth={2} name="HDL" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Triglycerides Chart */}
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Triglycerides
                      </Typography>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={trends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="dateLabel" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          {refRanges?.triglycerides && (
                            <ReferenceLine y={refRanges.triglycerides.max} stroke="red" strokeDasharray="3 3" />
                          )}
                          <Line type="monotone" dataKey="triglycerides" stroke="#ff7c7c" strokeWidth={2} name="Triglycerides" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </>
        )}

        {/* List View */}
        {!loading && view === 1 && (
          <>
            {results.length === 0 ? (
              <Alert severity="info">
                No lab results found. Click "Add Result" to create one.
              </Alert>
            ) : (
              <Grid container spacing={2}>
                {results.map((result) => (
                  <Grid item xs={12} key={result._id?.toString()}>
                    <Card>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                          <Box>
                            <Typography variant="h6">
                              {new Date(result.test_date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Ordered by: {result.ordered_by}
                            </Typography>
                          </Box>
                          <Chip label={result.test_type.replace(/_/g, ' ').toUpperCase()} color="primary" size="small" />
                        </Box>

                        {result.test_type === 'lipid_panel' && (
                          <Grid container spacing={2}>
                            {result.total_cholesterol && (
                              <Grid item xs={6} sm={3}>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">
                                    Total Cholesterol
                                  </Typography>
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <Typography variant="h6">
                                      {result.total_cholesterol.value}
                                    </Typography>
                                    <Chip
                                      label={result.total_cholesterol.flag}
                                      color={getFlagColor(result.total_cholesterol.flag) as any}
                                      size="small"
                                    />
                                  </Box>
                                  <Typography variant="caption">
                                    {result.total_cholesterol.unit}
                                  </Typography>
                                </Box>
                              </Grid>
                            )}
                            {result.ldl_cholesterol && (
                              <Grid item xs={6} sm={3}>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">
                                    LDL
                                  </Typography>
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <Typography variant="h6">
                                      {result.ldl_cholesterol.value}
                                    </Typography>
                                    <Chip
                                      label={result.ldl_cholesterol.flag}
                                      color={getFlagColor(result.ldl_cholesterol.flag) as any}
                                      size="small"
                                    />
                                  </Box>
                                  <Typography variant="caption">
                                    {result.ldl_cholesterol.unit}
                                  </Typography>
                                </Box>
                              </Grid>
                            )}
                            {result.hdl_cholesterol && (
                              <Grid item xs={6} sm={3}>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">
                                    HDL
                                  </Typography>
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <Typography variant="h6">
                                      {result.hdl_cholesterol.value}
                                    </Typography>
                                    <Chip
                                      label={result.hdl_cholesterol.flag}
                                      color={getFlagColor(result.hdl_cholesterol.flag) as any}
                                      size="small"
                                    />
                                  </Box>
                                  <Typography variant="caption">
                                    {result.hdl_cholesterol.unit}
                                  </Typography>
                                </Box>
                              </Grid>
                            )}
                            {result.triglycerides && (
                              <Grid item xs={6} sm={3}>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">
                                    Triglycerides
                                  </Typography>
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <Typography variant="h6">
                                      {result.triglycerides.value}
                                    </Typography>
                                    <Chip
                                      label={result.triglycerides.flag}
                                      color={getFlagColor(result.triglycerides.flag) as any}
                                      size="small"
                                    />
                                  </Box>
                                  <Typography variant="caption">
                                    {result.triglycerides.unit}
                                  </Typography>
                                </Box>
                              </Grid>
                            )}
                          </Grid>
                        )}

                        {result.notes && (
                          <Typography variant="body2" color="text.secondary" mt={2}>
                            Notes: {result.notes}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        )}
      </Container>
    </Box>
  );
}
